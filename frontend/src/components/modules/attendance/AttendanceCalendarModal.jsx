import React, { useState, useMemo, useEffect } from 'react';
import { useGetStudentAttendanceCalendarQuery } from '../../../redux/api/authApi';
import {
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiCalendar,
  FiPhone,
  FiCheck,
  FiClock,
  FiRotateCcw
} from 'react-icons/fi';
import AttendanceApiError from '../../shared/error-pages/AttendanceApiError';
import { useAttendanceErrorHandler } from '../../../hooks/useAttendanceErrorHandler';
import OrangeButton from '../../shared/sidebar/OrangeButton';

// Timezone-safe local date string formatter (YYYY-MM-DD)
const formatDateKey = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Calculate entire month bounds from a Date object
const getMonthBounds = (date) => {
  const y = date.getFullYear();
  const m = date.getMonth();
  const firstDay = new Date(y, m, 1);
  const lastDay = new Date(y, m + 1, 0);
  return {
    dateFrom: formatDateKey(firstDay),
    dateTo: formatDateKey(lastDay),
  };
};

const AttendanceCalendarModal = ({ isOpen, onClose, student, initialDateFrom }) => {
  // Initialize currentMonth to initialDateFrom or current date
  const [currentMonth, setCurrentMonth] = useState(() => {
    return initialDateFrom ? new Date(initialDateFrom) : new Date();
  });
  const [selectedDay, setSelectedDay] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'present', 'absent', 'holiday', 'weekend'

  // When initialDateFrom changes, update currentMonth
  useEffect(() => {
    if (initialDateFrom) {
      setCurrentMonth(new Date(initialDateFrom));
    }
    setSelectedDay(null);
    setActiveFilter('all');
  }, [initialDateFrom, isOpen]);

  // Compute dateFrom and dateTo for the entire active month
  const { dateFrom, dateTo } = useMemo(() => getMonthBounds(currentMonth), [currentMonth]);

  // Query backend for student attendance across the entire active month
  const { data: calendarData, isLoading, error } = useGetStudentAttendanceCalendarQuery(
    {
      stdId: student?.stdId,
      dateFrom,
      dateTo,
    },
    { skip: !isOpen || !student?.stdId }
  );

  // Gracefully handle attendance API errors
  useAttendanceErrorHandler(error, !!error, 'Student Calendar');

  const todayStr = formatDateKey(new Date());

  const getDayStatus = (dateStr, dayData, dayDate) => {
    // If it's a future date
    if (dateStr > todayStr) {
      if (dayData?.isHoliday) return 'holiday';
      if (dayData?.isWeekend || dayDate.getDay() === 0) return 'weekend';
      return 'upcoming';
    }

    if (!dayData) {
      if (dayDate.getDay() === 0) return 'weekend'; // Sunday is weekend
      return 'absent';
    }

    if (dayData.isHoliday) return 'holiday';
    if (dayData.isWeekend || dayDate.getDay() === 0) return 'weekend';

    const studentData = dayData.students?.find((s) => s.stdId === student?.stdId);
    if (studentData) {
      return studentData.status === 'present' ? 'present' : 'absent';
    }

    return 'absent';
  };

  // Generate complete 6-week calendar matrix for current month
  const calendar = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const cal = [];
    const current = new Date(startDate);

    for (let week = 0; week < 6; week++) {
      const weekDays = [];
      for (let day = 0; day < 7; day++) {
        const dateStr = formatDateKey(current);
        const dayData = calendarData?.data?.calendarData?.[dateStr];
        const isCurrentMonth = current.getMonth() === month;

        weekDays.push({
          date: new Date(current),
          dateStr,
          dayData,
          isCurrentMonth,
          isToday: dateStr === todayStr,
          status: isCurrentMonth ? getDayStatus(dateStr, dayData, current) : 'other-month',
        });
        current.setDate(current.getDate() + 1);
      }
      cal.push(weekDays);
    }
    return cal;
  }, [currentMonth, calendarData, student?.stdId, todayStr]);

  // Overall Attendance Summary Counts for this Month
  const summary = useMemo(() => {
    let presentCount = 0;
    let absentCount = 0;
    let holidayCount = 0;
    let weekendCount = 0;

    calendar.flat().forEach((day) => {
      if (day.isCurrentMonth) {
        if (day.status === 'present') presentCount++;
        else if (day.status === 'absent') absentCount++;
        else if (day.status === 'holiday') holidayCount++;
        else if (day.status === 'weekend') weekendCount++;
      }
    });

    return {
      present: presentCount,
      absent: absentCount,
      holiday: holidayCount,
      weekend: weekendCount,
    };
  }, [calendar]);

  const attendanceRate = useMemo(() => {
    const totalWorking = summary.present + summary.absent;
    return totalWorking > 0 ? Math.round((summary.present / totalWorking) * 100) : 0;
  }, [summary]);

  const changeMonth = (direction) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
    setSelectedDay(null);
  };

  const resetToToday = () => {
    setCurrentMonth(new Date());
    setSelectedDay(null);
  };

  const getInitials = (first, last) => {
    return `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase() || 'ST';
  };

  if (!isOpen) return null;

  return (
    <OrangeButton
      isOpen={isOpen}
      onClose={onClose}
      panelTitle="Attendance Calendar"
      panelSubtitle={`${student?.firstName || ''} ${student?.lastName || ''} · PR: ${student?.prkey || 'N/A'}`}
      showFooter={false}
      maxWidth="sm:max-w-xl"
      bodyClassName="p-3 sm:p-5"
      drawerContent={
        <div className="space-y-3 sm:space-y-3.5 text-gray-800">
          {/* ── 1. Compact Student Profile Bar (No Duplicate Name) ── */}
          <div className="bg-white border border-gray-200/90 rounded-2xl p-3 sm:p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 font-extrabold text-xs sm:text-sm flex items-center justify-center shrink-0 border border-orange-200/80 shadow-2xs">
                {getInitials(student?.firstName, student?.lastName)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                    {student?.firstName} {student?.lastName}
                  </h4>
                  {student?.course && (
                    <span className="text-[10px] font-semibold bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded border border-gray-200">
                      {student.course}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 truncate mt-0.5">
                  {student?.fathersName && <span>Father: <strong className="text-gray-700">{student.fathersName}</strong></span>}
                  {student?.mobile && (
                    <span className="ml-2">
                      • <a href={`tel:${student.mobile}`} className="text-orange-600 font-semibold hover:underline">{student.mobile}</a>
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Monthly Present Rate Badge */}
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2.5 py-1.5 rounded-xl shrink-0">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                Month Rate:
              </span>
              <span className="text-xs sm:text-sm font-black text-emerald-800">
                {attendanceRate}%
              </span>
            </div>
          </div>

          {/* ── 2. Interactive Attendance Summary Pills ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setActiveFilter(activeFilter === 'present' ? 'all' : 'present')}
              className={`flex items-center justify-between p-2 sm:p-2.5 rounded-xl border text-xs font-bold transition shadow-2xs cursor-pointer ${
                activeFilter === 'present'
                  ? 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-300'
                  : 'bg-emerald-50/70 text-emerald-800 border-emerald-200 hover:bg-emerald-100/60'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${activeFilter === 'present' ? 'bg-white' : 'bg-emerald-500'}`} />
                <span>Present</span>
              </div>
              <span className="text-xs sm:text-sm font-black">{summary.present}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter(activeFilter === 'absent' ? 'all' : 'absent')}
              className={`flex items-center justify-between p-2 sm:p-2.5 rounded-xl border text-xs font-bold transition shadow-2xs cursor-pointer ${
                activeFilter === 'absent'
                  ? 'bg-rose-600 text-white border-rose-600 ring-2 ring-rose-300'
                  : 'bg-rose-50/70 text-rose-800 border-rose-200 hover:bg-rose-100/60'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${activeFilter === 'absent' ? 'bg-white' : 'bg-rose-500'}`} />
                <span>Absent</span>
              </div>
              <span className="text-xs sm:text-sm font-black">{summary.absent}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter(activeFilter === 'holiday' ? 'all' : 'holiday')}
              className={`flex items-center justify-between p-2 sm:p-2.5 rounded-xl border text-xs font-bold transition shadow-2xs cursor-pointer ${
                activeFilter === 'holiday'
                  ? 'bg-amber-600 text-white border-amber-600 ring-2 ring-amber-300'
                  : 'bg-amber-50/70 text-amber-800 border-amber-200 hover:bg-amber-100/60'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${activeFilter === 'holiday' ? 'bg-white' : 'bg-amber-500'}`} />
                <span>Holiday</span>
              </div>
              <span className="text-xs sm:text-sm font-black">{summary.holiday}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter(activeFilter === 'weekend' ? 'all' : 'weekend')}
              className={`flex items-center justify-between p-2 sm:p-2.5 rounded-xl border text-xs font-bold transition shadow-2xs cursor-pointer ${
                activeFilter === 'weekend'
                  ? 'bg-slate-700 text-white border-slate-700 ring-2 ring-slate-300'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/60'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${activeFilter === 'weekend' ? 'bg-white' : 'bg-slate-400'}`} />
                <span>Weekend</span>
              </div>
              <span className="text-xs sm:text-sm font-black">{summary.weekend}</span>
            </button>
          </div>

          {/* Active Filter Notification Bar */}
          {activeFilter !== 'all' && (
            <div className="px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-xl text-xs flex items-center justify-between text-orange-800">
              <span className="font-semibold">
                Highlighting: <strong className="uppercase">{activeFilter}</strong> days
              </span>
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className="font-bold text-orange-600 hover:text-orange-900 flex items-center gap-1 cursor-pointer"
              >
                Show All <FiX className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ── 3. Calendar Card ── */}
          <div className="p-3 sm:p-4 bg-white rounded-2xl border border-gray-200/90 shadow-2xs">
            {/* Month Switcher Header */}
            <div className="flex items-center justify-between mb-3 bg-gray-50/90 p-2 rounded-xl border border-gray-150">
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                className="w-10 h-10 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 flex items-center justify-center transition shadow-2xs active:scale-95 cursor-pointer"
                aria-label="Previous Month"
              >
                <FiChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2">
                <FiCalendar className="w-4 h-4 text-orange-500" />
                <h3 className="text-xs sm:text-sm font-black text-gray-800 tracking-wide uppercase">
                  {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={resetToToday}
                  className="w-10 h-10 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 text-gray-600 flex items-center justify-center transition shadow-2xs active:scale-95 cursor-pointer"
                  title="Jump to Current Month"
                >
                  <FiRotateCcw className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => changeMonth(1)}
                  className="w-10 h-10 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 flex items-center justify-center transition shadow-2xs active:scale-95 cursor-pointer"
                  aria-label="Next Month"
                >
                  <FiChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-gray-400 font-medium">Loading month attendance...</span>
              </div>
            ) : error ? (
              <div className="py-4">
                <AttendanceApiError message="Attendance APIs are not reachable. Calendar data is currently unavailable." />
              </div>
            ) : (
              <>
                {/* Weekday Titles */}
                <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div
                      key={day}
                      className="font-bold text-gray-400 text-[10px] sm:text-xs uppercase tracking-wider py-1"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar 6x7 Grid */}
                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                  {calendar.flat().map((day, index) => {
                    const isSelected = selectedDay?.dateStr === day.dateStr;

                    // Filter dimming
                    const matchesFilter =
                      activeFilter === 'all' || (day.isCurrentMonth && day.status === activeFilter);
                    const isDimmed = !matchesFilter && day.isCurrentMonth;

                    let cellClasses =
                      'bg-gray-50/40 border border-gray-100 text-gray-300 opacity-20 select-none pointer-events-none';
                    let dotColor = null;

                    if (day.isCurrentMonth) {
                      if (day.status === 'present') {
                        cellClasses = `bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold hover:bg-emerald-100 shadow-2xs ${
                          isDimmed ? 'opacity-30' : ''
                        }`;
                        dotColor = 'bg-emerald-500';
                      } else if (day.status === 'absent') {
                        cellClasses = `bg-rose-50 text-rose-800 border border-rose-200 font-bold hover:bg-rose-100 shadow-2xs ${
                          isDimmed ? 'opacity-30' : ''
                        }`;
                        dotColor = 'bg-rose-500';
                      } else if (day.status === 'holiday') {
                        cellClasses = `bg-amber-50 text-amber-800 border border-amber-200 font-bold hover:bg-amber-100 shadow-2xs ${
                          isDimmed ? 'opacity-30' : ''
                        }`;
                        dotColor = 'bg-amber-500';
                      } else if (day.status === 'weekend') {
                        cellClasses = `bg-slate-100 text-slate-600 border border-slate-200 font-semibold hover:bg-slate-200 ${
                          isDimmed ? 'opacity-30' : ''
                        }`;
                        dotColor = 'bg-slate-400';
                      } else if (day.status === 'upcoming') {
                        cellClasses = `bg-white text-gray-500 border border-dashed border-gray-200 font-medium hover:bg-gray-50 ${
                          isDimmed ? 'opacity-30' : ''
                        }`;
                      } else {
                        cellClasses = 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50';
                      }
                    }

                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => day.isCurrentMonth && setSelectedDay(day)}
                        disabled={!day.isCurrentMonth}
                        className={`aspect-square w-full max-w-[44px] mx-auto flex flex-col items-center justify-center text-xs sm:text-sm rounded-xl transition-all duration-150 relative cursor-pointer active:scale-95 select-none ${cellClasses} ${
                          day.isToday ? 'ring-2 ring-blue-500/80' : ''
                        } ${
                          isSelected
                            ? 'ring-2 ring-orange-500 ring-offset-2 scale-105 z-10 font-black shadow-md'
                            : ''
                        }`}
                      >
                        <span>{day.date.getDate()}</span>
                        {dotColor && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full mt-0.5 shrink-0 ${dotColor}`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* ── 4. Selected Day Details Card (Opens on tap) ── */}
                {selectedDay && (
                  <div className="mt-3.5 p-3 sm:p-3.5 rounded-xl border border-orange-200 bg-orange-50/60 shadow-2xs flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900">
                          {selectedDay.date.toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${
                            selectedDay.status === 'present'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : selectedDay.status === 'absent'
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : selectedDay.status === 'holiday'
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : selectedDay.status === 'upcoming'
                              ? 'bg-gray-100 text-gray-700 border-gray-300'
                              : 'bg-slate-200 text-slate-800 border-slate-300'
                          }`}
                        >
                          {selectedDay.status}
                        </span>
                        {selectedDay.isToday && (
                          <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
                            Today
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-600 mt-1 truncate">
                        {selectedDay.status === 'present' && '✓ Student attended and marked present.'}
                        {selectedDay.status === 'absent' && '✗ Student was absent on this date.'}
                        {selectedDay.status === 'holiday' && (selectedDay.dayData?.holidayName || '🏖️ Institutional Holiday / Scheduled Off.')}
                        {selectedDay.status === 'weekend' && '📅 Weekend - Campus Closed.'}
                        {selectedDay.status === 'upcoming' && '⏳ Upcoming date in this month.'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedDay(null)}
                      className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-white/80 shrink-0 cursor-pointer"
                      title="Dismiss"
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* ── 5. Responsive Calendar Legend ── */}
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                    <span className="text-emerald-800">Present</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 shadow-2xs">
                    <div className="w-2 h-2 bg-rose-500 rounded-full" />
                    <span className="text-rose-800">Absent</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 shadow-2xs">
                    <div className="w-2 h-2 bg-amber-500 rounded-full" />
                    <span className="text-amber-800">Holiday</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                    <div className="w-2 h-2 bg-slate-400 rounded-full" />
                    <span className="text-slate-700">Weekend</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      }
    />
  );
};

export default AttendanceCalendarModal;