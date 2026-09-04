const User = require('../../models/user/user');
const jwt = require('jsonwebtoken');

class FaceAuthController {
  // Register face data for a user
  static async registerFace(req, res) {
    try {
      const { email, faceDescriptor } = req.body;

      if (!email || !faceDescriptor) {
        return res.status(400).json({
          success: false,
          message: 'Email and face descriptor are required'
        });
      }

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      user.faceDescriptor = faceDescriptor;
      await user.save();

      res.status(200).json({
        success: true,
        message: 'Face registered successfully'
      });

    } catch (error) {
      console.error('Face registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Login using face recognition - Mobile Optimized
  static async loginWithFace(req, res) {
    try {
      const { faceDescriptor } = req.body;
      const userAgent = req.headers['user-agent'] || '';
      const isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent);

      if (!faceDescriptor) {
        return res.status(400).json({
          success: false,
          message: 'Face descriptor is required'
        });
      }

      if (!Array.isArray(faceDescriptor) || faceDescriptor.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid face descriptor format'
        });
      }
      
      // Optimized query for mobile performance
      const users = await User.find(
        { faceDescriptor: { $exists: true, $ne: null } },
        { email: 1, faceDescriptor: 1, role: 1, name: 1, position: 1, department: 1, _id: 1 }
      ).limit(50); // Limit for mobile performance

      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No registered faces found. Please register your face first.'
        });
      }

      let matchedUser = null;
      // Adaptive threshold based on device
      let minDistance = isMobile ? 0.32 : 0.35; // Stricter for mobile
      let bestDistance = Infinity;
      
      // Production logging (reduced for performance)
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔍 Starting face matching with', users.length, 'registered users');
      }

      // Strict face matching with multiple validations
      for (const user of users) {
        try {
          if (user.faceDescriptor && Array.isArray(user.faceDescriptor) && user.faceDescriptor.length === faceDescriptor.length) {
            // Ensure descriptor has expected length (usually 128 for face-api.js)
            if (user.faceDescriptor.length < 100) {
              console.log(`⚠️ Skipping ${user.email}: Invalid descriptor length ${user.faceDescriptor.length}`);
              continue;
            }
            
            const distance = FaceAuthController.calculateDistanceFast(faceDescriptor, user.faceDescriptor);
            
            // Development logging only
            if (process.env.NODE_ENV !== 'production') {
              console.log(`📏 Distance for ${user.email}: ${distance.toFixed(4)} (threshold: ${minDistance})`);
            }
            
            // Mobile-specific validation
            const maxDistance = isMobile ? 3 : 5;
            if (distance > maxDistance) {
              if (process.env.NODE_ENV !== 'production') {
                console.log(`⚠️ Skipping ${user.email}: Distance ${distance.toFixed(4)} > ${maxDistance} (mobile: ${isMobile})`);
              }
              continue;
            }
            
            if (distance < bestDistance) {
              bestDistance = distance;
              if (distance < minDistance) {
                matchedUser = user;
                if (process.env.NODE_ENV !== 'production') {
                  console.log(`✅ Match found: ${user.email} with distance ${distance.toFixed(4)}`);
                }
                break; // Early exit on first good match
              }
            }
          }
        } catch (distanceError) {
          console.error('Distance calculation error for user:', user.email, distanceError);
          continue; // Skip this user and continue with next
        }
      }

      // Production logging
      if (process.env.NODE_ENV !== 'production') {
        console.log(`🎯 Best match distance: ${bestDistance.toFixed(4)}, Required: < ${minDistance}`);
      }
      
      if (!matchedUser) {
        return res.status(401).json({
          success: false,
          message: 'Face not recognized. Please ensure you are a registered user.'
        });
      }

      // Check if JWT_SECRET exists
      if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET not configured');
      }

      const token = jwt.sign(
        { 
          id: matchedUser._id, 
          email: matchedUser.email,
          role: matchedUser.role 
        },
        process.env.JWT_SECRET,
        { expiresIn: '2h' }
      );

      const refreshToken = jwt.sign(
        { id: matchedUser._id, role: matchedUser.role },
        process.env.JWT_SECRET,
        { expiresIn: '4h' }
      );

      // Update refresh token separately since we used lean query
      await User.findByIdAndUpdate(matchedUser._id, { refreshToken });

      res.status(200).json({
        success: true,
        message: 'Face login successful',
        token,
        refreshToken,
        user: {
          id: matchedUser._id,
          email: matchedUser.email,
          role: matchedUser.role,
          name: matchedUser.name,
          position: matchedUser.position,
          department: matchedUser.department
        }
      });

    } catch (error) {
      console.error('Face login error:', error);
      
      // More specific error messages
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid data provided'
        });
      }
      
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid user ID format'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Face authentication service temporarily unavailable'
      });
    }
  }

  // Accurate Euclidean distance calculation
  static calculateDistanceFast(descriptor1, descriptor2) {
    try {
      if (!descriptor1 || !descriptor2) {
        return 999; // High distance for invalid input
      }
      
      if (!Array.isArray(descriptor1) || !Array.isArray(descriptor2)) {
        return 999;
      }
      
      if (descriptor1.length !== descriptor2.length || descriptor1.length === 0) {
        return 999;
      }

      let sum = 0;
      const len = descriptor1.length;
      
      // More precise calculation
      for (let i = 0; i < len; i++) {
        const val1 = Number(descriptor1[i]);
        const val2 = Number(descriptor2[i]);
        
        if (!isFinite(val1) || !isFinite(val2)) {
          return 999; // Invalid numeric values
        }
        
        const diff = val1 - val2;
        sum += diff * diff;
      }
      
      const distance = Math.sqrt(sum);
      
      // Ensure valid distance
      if (!isFinite(distance) || distance < 0) {
        return 999;
      }
      
      return distance;
    } catch (error) {
      console.error('Distance calculation error:', error);
      return 999; // Return high distance on error
    }
  }

  // Keep original for backward compatibility
  static calculateDistance(descriptor1, descriptor2) {
    return FaceAuthController.calculateDistanceFast(descriptor1, descriptor2);
  }

  static async checkFaceRegistration(req, res) {
    try {
      const { email } = req.params;

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.status(200).json({
        success: true,
        hasFaceRegistered: !!user.faceDescriptor
      });

    } catch (error) {
      console.error('Check face registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = FaceAuthController;