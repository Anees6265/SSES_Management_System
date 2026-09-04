const Subject = require('../../models/syllabus/Subject');
const SyllabusVersion = require('../../models/syllabus/SyllabusVersion');

// Create Subject
exports.createSubject = async (req, res) => {
  try {
    const { syllabusVersionId, name, code, description } = req.body;

    const subject = await Subject.create({
      syllabusVersionId,
      name,
      code,
      description
    });

    await SyllabusVersion.findByIdAndUpdate(
      syllabusVersionId,
      { $addToSet: { subjectIds: subject._id } }
    );

    res.status(201).json({ success: true, data: subject });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get All Subjects by SyllabusVersion
exports.getSubjectsBySyllabusVersion = async (req, res) => {
  try {
    const { syllabusVersionId } = req.params;

    const subjects = await Subject.find({ 
      syllabusVersionId, 
      isActive: true 
    }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: subjects });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get Subject by ID
exports.getSubjectById = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);

    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    res.status(200).json({ success: true, data: subject });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Update Subject
exports.updateSubject = async (req, res) => {
  try {
    const subject = await Subject.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    res.status(200).json({ success: true, data: subject });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete Subject (Soft Delete)
exports.deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    res.status(200).json({ success: true, message: 'Subject deleted successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
