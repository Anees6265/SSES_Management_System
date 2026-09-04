import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useGetItegAttendanceQuery } from '../../../redux/api/authApi';
import { FiCalendar, FiUsers, FiTrendingUp, FiSearch, FiEye } from 'react-icons/fi';
import { BsPersonFill, BsPersonFillCheck } from 'react-icons/bs';
import { useNavigate } from 'react-router-dom';
import AttendanceApiError from '../../shared/error-pages/AttendanceApiError';
import { useAttendanceErrorHandler } from '../../../hooks/useAttendanceErrorHandler';
import DatePicker from '../../shared/DatePicker';


// Helper function to get current week dates
const getCurrentWeekDates = () => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - dayOfWeek);
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + (6 - dayOfWeek));
  
  return {
    dateFrom: startOfWeek.toISOString().split('T')[0],
    dateTo: endOfWeek.toISOString().split('T')[0]
  };
};

const AttendanceChart = () => {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState(getCurrentWeekDates());
  const [tempDateRange, setTempDateRange] = useState(getCurrentWeekDates());
  const [dateError, setDateError] = useState('');

  const { data: attendanceData, isLoading, error, refetch } = useGetItegAttendanceQuery(dateRange);
  
  // Handle attendance API errors gracefully
  useAttendanceErrorHandler(error, !!error, 'Attendance Chart');

  const chartData = useMemo(() => {
    if (!attendanceData?.data?.itegAttendanceList) return [];
    return attendanceData.data.itegAttendanceList.map(item => ({
      year: `Year ${item.year}`,
      attendance: parseFloat(item.attendancePercent.replace('%', '')),
      male: parseFloat(item.maleStudentPercent.replace('%', '')),
      female: parseFloat(item.femaleStudentPercent.replace('%', '')),
      totalStudents: item.totalStudents,
      totalAttendance: item.totalAttendance
    }));
  }, [attendanceData]);

  const pieData = useMemo(() => {
    if (!attendanceData?.data?.summary) return [];
    const { totalMaleStudents, totalFemaleStudents } = attendanceData.data.summary;
    return [
      { name: 'Male Students', value: totalMaleStudents, fill: '#fb923c' },
      { name: 'Female Students', value: totalFemaleStudents, fill: '#cbd5e1' }
    ];
  }, [attendanceData]);

  const handleTempDateChange = (field, value) => {
    const today = new Date().toISOString().split('T')[0];
    
    // Prevent future dates
    if (value > today) {
      setDateError('Cannot select future dates');
      return;
    }
    
    const newRange = { ...tempDateRange, [field]: value };
    
    // Validate date range
    if (newRange.dateFrom && newRange.dateTo) {
      if (new Date(newRange.dateTo) < new Date(newRange.dateFrom)) {
        setDateError('End date must be equal to or greater than start date');
        return;
      }
    }
    
    setDateError('');
    setTempDateRange(newRange);
    
    // Auto search when To date is selected and both dates are valid
    if (field === 'dateTo' && newRange.dateFrom && newRange.dateTo && !dateError) {
      setDateRange(newRange);
      refetch();
    }
  };

  const handleSearch = () => {
    if (dateError) return;
    setDateRange(tempDateRange);
    refetch();
  };

  const handleReset = () => {
    const currentWeek = getCurrentWeekDates();
    setDateError('');
    setTempDateRange(currentWeek);
    setDateRange(currentWeek);
    refetch();
  };

  const handleViewAttendance = () => {
    navigate('/attendance-details');
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{label}</p>
          <p className="text-sm" style={{ color: '#f97316' }}>
            Overall: <span className="font-medium">{data.attendance}%</span>
          </p>
          <p className="text-sm" style={{ color: '#fb923c' }}>
            Male: <span className="font-medium">{data.male}%</span>
          </p>
          <p className="text-sm" style={{ color: '#94a3b8' }}>
            Female: <span className="font-medium">{data.female}%</span>
          </p>
          <p className="text-sm text-gray-600">
            Students: <span className="font-medium">{data.totalStudents}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden mb-8">
      <div className="px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-50 text-orange-500">
              <FiTrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">ITEG Attendance Analytics</h3>
              <p className="text-sm text-gray-600">Year-wise attendance tracking and insights</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-500 bg-slate-50 border border-slate-100 rounded-xl px-4 py-1.5 font-medium">
            <FiCalendar className="w-4 h-4 text-orange-500" />
            <span>Current Week: {dateRange.dateFrom} to {dateRange.dateTo}</span>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Date Range Filters */}
        <div className="mb-6 p-4 bg-white rounded-xl border border-gray-200">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[140px]">
              <DatePicker
                label="From Date"
                value={tempDateRange.dateFrom}
                max={new Date().toISOString().split('T')[0]}
                onChange={(value) => handleTempDateChange('dateFrom', value)}
                className="black-calendar-icon"
              />
            </div>
            <div className="flex-1 min-w-[140px]">
              <DatePicker
                label="To Date"
                value={tempDateRange.dateTo}
                min={tempDateRange.dateFrom}
                max={new Date().toISOString().split('T')[0]}
                onChange={(value) => handleTempDateChange('dateTo', value)}
                className="black-calendar-icon"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="px-4 py-2.5 h-[40px] border border-gray-200 bg-white hover:bg-slate-50 hover:border-gray-300 text-gray-700 rounded-lg text-sm font-semibold transition shadow-sm"
              >
                Reset
              </button>
              <button
                onClick={handleViewAttendance}
                className="px-4 py-2.5 h-[40px] bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition flex items-center gap-2 shadow-sm"
              >
                <FiEye className="w-4 h-4" />
                View Attendance
              </button>
            </div>
          </div>
          {dateError && (
            <div className="mt-2 text-sm text-red-600 font-medium">
              {dateError}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading attendance data...</p>
            </div>
          </div>
        ) : error ? (
          <AttendanceApiError 
            onRetry={refetch}
            message="Attendance APIs are not working. Please try again later."
          />
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-gray-150 shadow-sm p-4 flex justify-between items-center transition hover:shadow-md">
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Students</p>
                  <p className="text-2xl font-extrabold text-gray-800 mt-0.5">
                    {parseInt(attendanceData?.data?.summary?.totalITEGStudents) || 0}
                  </p>
                </div>
                <div className="bg-orange-50 text-orange-500 p-2.5 rounded-xl shrink-0">
                  <FiUsers size={20} />
                </div>
              </div>
              
              <div className="bg-white rounded-xl border border-gray-150 shadow-sm p-4 flex justify-between items-center transition hover:shadow-md">
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Male Students</p>
                  <p className="text-2xl font-extrabold text-gray-800 mt-0.5">
                    {parseInt(attendanceData?.data?.summary?.totalMaleStudents) || 0}
                  </p>
                </div>
                <div className="bg-orange-50 text-orange-500 p-2.5 rounded-xl shrink-0">
                  <BsPersonFill size={20} />
                </div>
              </div>
              
              <div className="bg-white rounded-xl border border-gray-150 shadow-sm p-4 flex justify-between items-center transition hover:shadow-md">
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Female Students</p>
                  <p className="text-2xl font-extrabold text-gray-800 mt-0.5">
                    {parseInt(attendanceData?.data?.summary?.totalFemaleStudents) || 0}
                  </p>
                </div>
                <div className="bg-orange-50 text-orange-500 p-2.5 rounded-xl shrink-0">
                  <BsPersonFillCheck size={20} />
                </div>
              </div>
              
              <div className="bg-white rounded-xl border border-gray-150 shadow-sm p-4 flex justify-between items-center transition hover:shadow-md">
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Working Days</p>
                  <p className="text-2xl font-extrabold text-gray-800 mt-0.5">
                    {parseInt(attendanceData?.data?.dateRange?.workingDays) || 0}
                  </p>
                </div>
                <div className="bg-orange-50 text-orange-500 p-2.5 rounded-xl shrink-0">
                  <FiCalendar size={20} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Bar Chart */}
              <div className="lg:col-span-2 bg-white rounded-xl p-5 border shadow-sm">
                <h4 className="text-sm font-semibold text-gray-700 mb-6">Year-wise Attendance</h4>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis 
                        dataKey="year" 
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12, fill: '#94a3b8' }}
                      />
                      <YAxis 
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12, fill: '#94a3b8' }}
                        domain={[0, 100]}
                        tickFormatter={(value) => `${value}%`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="attendance" fill="#f97316" radius={[4, 4, 0, 0]} barSize={25} />
                      <Bar dataKey="male" fill="#fb923c" radius={[4, 4, 0, 0]} barSize={25} />
                      <Bar dataKey="female" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={25} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Pie Chart */}
              <div className="bg-white rounded-xl p-5 border shadow-sm flex flex-col justify-between">
                <h4 className="text-sm font-semibold text-gray-700 mb-4">Gender Distribution</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name) => [value, name]}
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '12px'
                        }}
                        itemStyle={{ color: '#fff' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 mt-2">
                  {pieData.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.fill }}></div>
                      <span className="text-xs text-gray-600 font-semibold">{entry.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Year-wise Details */}
            {attendanceData?.data?.itegAttendanceList && (
              <div className="bg-white rounded-lg p-4">
                <h4 className="text-lg font-semibold text-gray-800 mb-4">Detailed Statistics</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {attendanceData.data.itegAttendanceList.map((yearData, index) => (
                    <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-lg font-semibold text-gray-900">Year {yearData.year}</span>
                        <span className={`text-xl font-bold ${
                          parseFloat(yearData.attendancePercent) >= 80 ? 'text-green-600' :
                          parseFloat(yearData.attendancePercent) >= 60 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {yearData.attendancePercent}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Students:</span>
                          <span className="font-medium">{yearData.totalStudents}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Male:</span>
                          <span className="font-medium" style={{ color: '#60A5FA' }}>{yearData.maleStudentPercent}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Female:</span>
                          <span className="font-medium" style={{ color: '#F472B6' }}>{yearData.femaleStudentPercent}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Attendance:</span>
                          <span className="font-medium">{yearData.totalAttendance}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Date Range Info */}
            {attendanceData?.data?.dateRange && (
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="flex items-center justify-center gap-6 text-sm text-orange-800">
                  <span>Period: {attendanceData.data.dateRange.from} to {attendanceData.data.dateRange.to}</span>
                  <span>•</span>
                  <span>Working Days: {attendanceData.data.dateRange.workingDays}</span>
                  <span>•</span>
                  <span>Total Days: {attendanceData.data.dateRange.totalDays}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceChart;