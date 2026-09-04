const SubTopic = require('../../models/syllabus/SubTopic');
const SyllabusVersion = require('../../models/syllabus/SyllabusVersion');

// Create SubTopic
exports.createSubTopic = async (req, res) => {
  try {
    const { syllabusVersionId, subjectId, topicId, name, order } = req.body;

    const subTopic = await SubTopic.create({
      syllabusVersionId,
      subjectId,
      topicId,
      name,
      order
    });

    await SyllabusVersion.findByIdAndUpdate(
      syllabusVersionId,
      { $addToSet: { subTopicIds: subTopic._id } }
    );

    res.status(201).json({ success: true, data: subTopic });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get SubTopics by Topic
exports.getSubTopicsByTopic = async (req, res) => {
  try {
    const { topicId } = req.params;

    const subTopics = await SubTopic.find({ 
      topicId, 
      isActive: true 
    })
      .populate('subjectId', 'name code')
      .populate('topicId', 'name')
      .sort({ order: 1 });

    res.status(200).json({ success: true, data: subTopics });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get SubTopic by ID
exports.getSubTopicById = async (req, res) => {
  try {
    const subTopic = await SubTopic.findById(req.params.id)
      .populate('subjectId', 'name code')
      .populate('topicId', 'name');

    if (!subTopic) {
      return res.status(404).json({ success: false, message: 'SubTopic not found' });
    }

    res.status(200).json({ success: true, data: subTopic });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Update SubTopic
exports.updateSubTopic = async (req, res) => {
  try {
    const subTopic = await SubTopic.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('subjectId', 'name code')
      .populate('topicId', 'name');

    if (!subTopic) {
      return res.status(404).json({ success: false, message: 'SubTopic not found' });
    }

    res.status(200).json({ success: true, data: subTopic });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete SubTopic (Soft Delete)
exports.deleteSubTopic = async (req, res) => {
  try {
    const subTopic = await SubTopic.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!subTopic) {
      return res.status(404).json({ success: false, message: 'SubTopic not found' });
    }

    res.status(200).json({ success: true, message: 'SubTopic deleted successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
