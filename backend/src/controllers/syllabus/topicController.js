const Topic = require('../../models/syllabus/Topic');
const SyllabusVersion = require('../../models/syllabus/SyllabusVersion');

// Create Topic
exports.createTopic = async (req, res) => {
  try {
    const { syllabusVersionId, subjectId, name, order } = req.body;

    const topic = await Topic.create({
      syllabusVersionId,
      subjectId,
      name,
      order
    });

    await SyllabusVersion.findByIdAndUpdate(
      syllabusVersionId,
      { $addToSet: { topicIds: topic._id } }
    );

    res.status(201).json({ success: true, data: topic });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get Topics by Subject
exports.getTopicsBySubject = async (req, res) => {
  try {
    const { subjectId } = req.params;

    const topics = await Topic.find({ 
      subjectId, 
      isActive: true 
    })
      .populate('subjectId', 'name code')
      .sort({ order: 1 });

    res.status(200).json({ success: true, data: topics });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get Topic by ID
exports.getTopicById = async (req, res) => {
  try {
    const topic = await Topic.findById(req.params.id)
      .populate('subjectId', 'name code');

    if (!topic) {
      return res.status(404).json({ success: false, message: 'Topic not found' });
    }

    res.status(200).json({ success: true, data: topic });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Update Topic
exports.updateTopic = async (req, res) => {
  try {
    const topic = await Topic.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('subjectId', 'name code');

    if (!topic) {
      return res.status(404).json({ success: false, message: 'Topic not found' });
    }

    res.status(200).json({ success: true, data: topic });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete Topic (Soft Delete)
exports.deleteTopic = async (req, res) => {
  try {
    const topic = await Topic.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!topic) {
      return res.status(404).json({ success: false, message: 'Topic not found' });
    }

    res.status(200).json({ success: true, message: 'Topic deleted successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
