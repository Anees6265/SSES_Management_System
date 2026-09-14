import { useState, useMemo, useEffect } from 'react';
import { useGetStudentAttendanceCalendarQuery } from '../../../redux/api/authApi';
import { FiX, FiChevronLeft, FiChevronRight, FiCalendar, FiUser } from 'react-icons/fi';
import AttendanceApiError from '../../shared/error-pages/AttendanceApiError';
import { useAttendanceErrorHandler } from '../../../hooks/useAttendanceErrorHandler';
import OrangeButton from '../../shared/sidebar/OrangeButton';

const AttendanceCalendarModal = ({ isOpen, onClose, student, initialDateFrom, initialDateTo }) => {
  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);
  const [currentMonth, setCurrentMonth] = useState(new Date(initialDateFrom));

  // Update dates when props change
  useEffect(() => {
    setDateFrom(initialDateFrom);
    setDateTo(initialDateTo);
    setCurrentMonth(new Date(initialDateFrom));
  }, [initialDateFrom, initialDateTo]);

  const { data: calendarData, isLoading, error } = useGetStudentAttendanceCalendarQuery({
    stdId: student?.stdId,
    dateFrom,
    dateTo
  }, { skip: !isOpen || !student?.stdId });
  
  // Handle attendance API errors gracefully
  useAttendanceErrorHandler(error, !!error, 'Student Calendar');



  const getDayStatus = (date, dayData) => {
    if (!dayData) {
      // If no data exists for this date, assume it's a working day and mark as absent
      return 'absent';
    }
    
    if (dayData.isHoliday) return 'holiday';
    if (dayData.isWeekend) return 'weekend';
    
    // Check if student has attendance data for this day
    const studentData = dayData.students?.find(s => s.stdId === student?.stdId);
    if (studentData) {
      return studentData.status === 'present' ? 'present' : 'absent';
    }
    
    // If no student data but it's a working day, consider as absent
    return 'absent';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return 'bg-green-50 text-green-700 border border-green-200';
      case 'absent': return 'bg-red-50 text-red-700 border border-red-200';
      case 'holiday': return 'bg-orange-50 text-orange-700 border border-orange-200';
      case 'weekend': return 'bg-slate-50 text-slate-700 border border-slate-200';
      default: return 'bg-slate-50 text-slate-500 border border-slate-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present': return '✓';
      case 'absent': return '✗';
      case 'holiday': return '🏖️';
      case 'weekend': return '📅';
      default: return '';
    }
  };

  const generateCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    
    const calendar = [];

    const current = new Date(startDate);
    
    for (let week = 0; week < 6; week++) {
      const weekDays = [];
      for (let day = 0; day < 7; day++) {
        const dateStr = current.toISOString().split('T')[0];
        const dayData = calendarData?.data?.calendarData?.[dateStr];
        const isCurrentMonth = current.getMonth() === month;
        
        const currentDateStr = current.toISOString().split('T')[0];
        const isInRange = currentDateStr >= dateFrom && currentDateStr <= dateTo;
        
        weekDays.push({
          date: new Date(current),
          dateStr,
          dayData,
          isCurrentMonth,
          isInRange,
          status: isInRange ? getDayStatus(dateStr, dayData) : 'other-month'
        });
        current.setDate(current.getDate() + 1);
      }
      calendar.push(weekDays);
    }
    return calendar;
  };
  
  const calendar = useMemo(() => generateCalendar(), [currentMonth, calendarData, dateFrom, dateTo]);
  
  const summary = useMemo(() => {
    if (!calendarData?.data?.calendarData) return { present: 0, absent: 0, holiday: 0, weekend: 0 };
    
    const calData = calendarData.data.calendarData;
    
    let presentCount = 0;
    let absentCount = 0;
    let holidayCount = 0;
    let weekendCount = 0;
    
    Object.entries(calData).forEach(([dateStr, dayData]) => {
      if (dateStr >= dateFrom && dateStr <= dateTo) {
        if (dayData.isHoliday) {
          holidayCount++;
        } else if (dayData.isWeekend) {
          weekendCount++;
        } else {
          const studentData = dayData.students?.find(s => s.stdId === student?.stdId);
          if (studentData) {
            if (studentData.status === 'present') {
              presentCount++;
            } else {
              absentCount++;
            }
          } else {
            absentCount++;
          }
        }
      }
    });
    
    return {
      present: presentCount,
      absent: absentCount,
      holiday: holidayCount,
      weekend: weekendCount
    };
  }, [calendarData, student, dateFrom, dateTo]);

  const attendanceRate = useMemo(() => {
    const total = summary.present + summary.absent;
    return total > 0 ? Math.round((summary.present / total) * 100) : 0;
  }, [summary]);

  const canNavigateMonth = (direction) => {
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    
    if (direction === -1) {
      return newMonth >= new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
    } else {
      return newMonth <= new Date(toDate.getFullYear(), toDate.getMonth(), 1);
    }
  };
  
  const changeMonth = (direction) => {
    if (!canNavigateMonth(direction)) return;
    
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  const getInitials = (first, last) => {
    return `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase() || 'ST';
  };

  const radius = 15;
  const strokeWidth = 3;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (attendanceRate / 100) * circumference;

  if (!isOpen) return null;

  return (
    <OrangeButton
      isOpen={isOpen}
      onClose={onClose}
      panelTitle={`${student?.firstName || ''} ${student?.lastName || ''}`}
      panelSubtitle="Attendance Profile & Monthly Calendar"
      showFooter={false}
      maxWidth="sm:max-w-xl"
      bodyClassName="p-3 sm:p-5"
      drawerContent={
        <div className="space-y-3 sm:space-y-4">
          {/* Top Progress & Metrics */}
          <div className="flex items-center justify-between p-3 sm:p-4 bg-orange-50/70 border border-orange-100 rounded-xl">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center bg-gradient-to-tr from-orange-400 to-amber-500 text-white font-extrabold text-xs sm:text-sm shadow-md shrink-0">
                {getInitials(student?.firstName, student?.lastName)}
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                  {student?.firstName} {student?.lastName}
                </h3>
                <p className="text-[10px] sm:text-[11px] text-gray-500 truncate">Prkey: {student?.prkey || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="text-right">
                <span className="text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase block">Present Rate</span>
                <span className="text-xs sm:text-sm font-extrabold text-gray-900">{attendanceRate}%</span>
              </div>
              <div className="relative w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center shrink-0">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 transform -rotate-90">
                  <circle
                    cx="20"
                    cy="20"
                    r={radius}
                    className="stroke-gray-200"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                  />
                  <circle
                    cx="20"
                    cy="20"
                    r={radius}
                    className="stroke-emerald-500 transition-all duration-1000 ease-out"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="p-3 sm:p-4 border border-gray-100 bg-slate-50/60 rounded-xl text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-3">
              <div className="bg-white border border-gray-100 rounded-xl p-2.5 sm:p-3 shadow-xs">
                <span className="text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Father's Name</span>
                <span className="font-bold text-gray-800 text-xs sm:text-sm mt-0.5 block truncate" title={student?.fathersName}>
                  {student?.fathersName || 'N/A'}
                </span>
              </div>
              
              <div className="bg-white border border-gray-100 rounded-xl p-2.5 sm:p-3 shadow-xs">
                <span className="text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Mobile Contact</span>
                <span className="font-bold text-gray-800 text-xs sm:text-sm mt-0.5 block truncate">
                  {student?.mobile || 'N/A'}
                </span>
              </div>

              <div className="bg-white border border-gray-100 rounded-xl p-2.5 sm:p-3 shadow-xs col-span-2 sm:col-span-1">
                <span className="text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Scope Range</span>
                <span className="font-semibold text-gray-700 text-[10px] sm:text-xs mt-1 block bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5 w-fit">
                  {dateFrom} to {dateTo}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 pt-2.5 border-t border-gray-200/60">
              <span className="inline-flex items-center justify-center px-2 py-1 rounded-lg text-[11px] sm:text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 shrink-0"></span>
                Present: <strong className="ml-1 text-emerald-800">{summary.present}</strong>
              </span>
              <span className="inline-flex items-center justify-center px-2 py-1 rounded-lg text-[11px] sm:text-xs font-bold bg-rose-50 text-rose-700 border border-rose-100 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5 shrink-0"></span>
                Absent: <strong className="ml-1 text-rose-800">{summary.absent}</strong>
              </span>
              <span className="inline-flex items-center justify-center px-2 py-1 rounded-lg text-[11px] sm:text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 shrink-0"></span>
                Holiday: <strong className="ml-1 text-amber-800">{summary.holiday}</strong>
              </span>
              <span className="inline-flex items-center justify-center px-2 py-1 rounded-lg text-[11px] sm:text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5 shrink-0"></span>
                Weekend: <strong className="ml-1 text-slate-800">{summary.weekend}</strong>
              </span>
            </div>
          </div>

          {/* Calendar Box */}
          <div className="p-3 sm:p-4 bg-white rounded-xl border border-gray-100 shadow-xs">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-3 sm:mb-4 bg-slate-50 p-2 sm:p-2.5 rounded-xl border border-slate-100">
              <button 
                onClick={() => changeMonth(-1)} 
                disabled={!canNavigateMonth(-1)}
                className={`p-1.5 sm:p-2 rounded-lg border transition duration-200 shadow-xs cursor-pointer ${
                  canNavigateMonth(-1) 
                    ? 'border-gray-200 bg-white hover:bg-slate-50 text-gray-700 hover:border-gray-300 active:scale-95' 
                    : 'border-gray-100 bg-transparent text-gray-300 cursor-not-allowed opacity-40'
                }`}
                aria-label="Previous Month"
              >
                <FiChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              
              <div className="flex items-center gap-1.5 sm:gap-2">
                <FiCalendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500" />
                <h3 className="text-[11px] sm:text-xs font-extrabold text-gray-700 tracking-wider uppercase">
                  {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
              </div>
              
              <button 
                onClick={() => changeMonth(1)} 
                disabled={!canNavigateMonth(1)}
                className={`p-1.5 sm:p-2 rounded-lg border transition duration-200 shadow-xs cursor-pointer ${
                  canNavigateMonth(1) 
                    ? 'border-gray-200 bg-white hover:bg-slate-50 text-gray-700 hover:border-gray-300 active:scale-95' 
                    : 'border-gray-100 bg-transparent text-gray-300 cursor-not-allowed opacity-40'
                }`}
                aria-label="Next Month"
              >
                <FiChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : error ? (
              <div className="py-4">
                <AttendanceApiError 
                  message="Attendance APIs are not working. Calendar data is currently unavailable."
                />
              </div>
            ) : (
              <>
                {/* Day Titles */}
                <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center font-extrabold text-slate-400 text-[9px] sm:text-[10px] uppercase tracking-wider">
                      {day}
                    </div>
                  ))}
                </div>
                
                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                  {calendar.flat().map((day, index) => {
                    const isPresent = day.isInRange && day.status === 'present';
                    const isAbsent = day.isInRange && day.status === 'absent';
                    const isHoliday = day.isInRange && day.status === 'holiday';
                    const isWeekend = day.isInRange && day.status === 'weekend';
                    
                    let cellClasses = "bg-slate-50/50 border border-slate-100/50 text-gray-300 opacity-30 select-none pointer-events-none relative";
                    let dot = null;
                    if (day.isInRange) {
                      if (isPresent) {
                        cellClasses = "bg-emerald-50 text-emerald-700 border-2 border-emerald-100 font-bold hover:bg-emerald-100 hover:border-emerald-200 shadow-xs cursor-pointer";
                        dot = <span className="absolute bottom-0.5 sm:bottom-1 w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full bg-emerald-500"></span>;
                      } else if (isAbsent) {
                        cellClasses = "bg-rose-50 text-rose-700 border-2 border-rose-100 font-bold hover:bg-rose-100 hover:border-rose-200 shadow-xs cursor-pointer";
                        dot = <span className="absolute bottom-0.5 sm:bottom-1 w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full bg-rose-500"></span>;
                      } else if (isHoliday) {
                        cellClasses = "bg-amber-50 text-amber-700 border-2 border-amber-100 font-bold hover:bg-amber-100 hover:border-amber-200 shadow-xs cursor-pointer";
                        dot = <span className="absolute bottom-0.5 sm:bottom-1 w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full bg-amber-500"></span>;
                      } else if (isWeekend) {
                        cellClasses = "bg-slate-50 text-slate-500 border border-slate-200 font-semibold hover:bg-slate-100 shadow-xs cursor-pointer";
                        dot = <span className="absolute bottom-0.5 sm:bottom-1 w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full bg-slate-400"></span>;
                      } else {
                        cellClasses = "bg-white border border-gray-200 text-gray-700 hover:bg-slate-50 hover:border-gray-300 transition cursor-pointer";
                      }
                    } else if (day.isCurrentMonth) {
                      cellClasses = "bg-white border border-gray-100 text-gray-300 opacity-40 select-none pointer-events-none";
                    }

                    return (
                      <div
                        key={index}
                        className={`h-8 w-8 sm:h-10 sm:w-10 mx-auto flex items-center justify-center text-[11px] sm:text-xs rounded-lg sm:rounded-xl transition-all duration-200 relative ${cellClasses}`}
                      >
                        <span>{day.date.getDate()}</span>
                        {dot}
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="mt-4 grid grid-cols-2 sm:flex sm:flex-wrap gap-2 justify-center text-[9px] sm:text-[10px] font-bold text-gray-500 uppercase tracking-wider pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-center gap-1.5 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 shadow-xs">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    <span>Present</span>
                  </div>
                  <div className="flex items-center justify-center gap-1.5 bg-rose-50 px-2 py-1 rounded-lg border border-rose-100 shadow-xs">
                    <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
                    <span>Absent</span>
                  </div>
                  <div className="flex items-center justify-center gap-1.5 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100 shadow-xs">
                    <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                    <span>Holiday</span>
                  </div>
                  <div className="flex items-center justify-center gap-1.5 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 shadow-xs">
                    <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                    <span>Weekend</span>
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