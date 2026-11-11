const normalizeCell = (v) => String(v ?? "").trim();

/**
 * Extracts a millisecond timestamp from a task document using assignedAt, createdAt,
 * or the ObjectId timestamp prefix as a deterministic fallback.
 */
export const getTaskTimestamp = (item) => {
  if (!item) return 0;
  if (item.assignedAt) {
    const t = new Date(item.assignedAt).getTime();
    if (!Number.isNaN(t) && t > 0) return t;
  }
  if (item.createdAt) {
    const t = new Date(item.createdAt).getTime();
    if (!Number.isNaN(t) && t > 0) return t;
  }
  if (item._id) {
    try {
      const t = parseInt(item._id.toString().substring(0, 8), 16) * 1000;
      if (!Number.isNaN(t) && t > 0) return t;
    } catch (_) {
      return 0;
    }
  }
  return 0;
};

/**
 * Sorts tasks in ascending insertion / Excel sheet order (earliest first, lowest _id first).
 */
export const sortTasksAscending = (tasks = []) =>
  [...(tasks || [])].sort((a, b) => {
    const timeA = getTaskTimestamp(a);
    const timeB = getTaskTimestamp(b);
    if (timeA !== timeB) return timeA - timeB;
    const idA = String(a?._id || a?.id || "");
    const idB = String(b?._id || b?.id || "");
    if (idA < idB) return -1;
    if (idA > idB) return 1;
    return 0;
  });

/**
 * Sorts syllabus entities (subjects, topics, subTopics) by numeric `order` ascending.
 */
export const sortByOrderAsc = (list = []) =>
  [...(list || [])].sort((a, b) => (Number(a?.order) || 0) - (Number(b?.order) || 0));

/**
 * Maps parsed Excel rows for combined syllabus + tasks upload while preserving exact sheet order.
 */
export const mapCombinedExcelRows = (rows = []) =>
  (rows || [])
    .map((row) => ({
      subject: normalizeCell(row["Subject"] || row["subject"] || row["SUBJECT"]),
      topic: normalizeCell(row["Topic"] || row["Topic Name"] || row["topic"] || row["TOPIC"]),
      subTopic: normalizeCell(
        row["SubTopic"] || row["Sub Topic"] || row["subTopic"] || row["subtopic"] || row["sub_topic"] || row["SUBTOPIC"]
      ),
      taskTitle: normalizeCell(
        row["Task"] || row["Task Title"] || row["taskTitle"] || row["Tasks"] || row["TASK"] || row["title"] || row["Title"]
      ),
      taskType: normalizeCell(row["taskType"] || row["TaskType"] || row["Task Type"] || row["TASK TYPE"] || "assessment").toLowerCase(),
      priority: normalizeCell(row["priority"] || row["Priority"] || row["PRIORITY"] || "medium").toLowerCase(),
      maxMarks: Math.min(5, Math.max(1, Number(row["maxMarks"] || row["MaxMarks"] || row["Max Marks"] || row["MAX MARKS"] || 5))),
      timeDays: row["Time Days"] || row["timeDays"] || row["TimeDays"] || row["Time"] || row["TIME DAYS"] || null,
      measurablePoints: normalizeCell(
        row["Measurable Points"] || row["Measurable Point"] || row["measurablePoints"] || row["MEASURABLE POINTS"]
      ),
    }))
    .filter((r) => r.subject && r.topic);

