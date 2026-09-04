import { useNavigate } from "react-router-dom";
import { FiHeadphones, FiArrowLeft, FiMail, FiMessageSquare } from "react-icons/fi";
import Header from "../../shared/sidebar/Header";

const Supportfile = () => {
  const navigate = useNavigate();

  return (
    <>
      <Header sidebarOpen={true} title="Support & Help" />
      <div className="min-h-[calc(100vh-80px)] bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-100 shadow-xl p-8 text-center relative overflow-hidden">
          {/* Decorative background shapes */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-100 rounded-full blur-2xl opacity-70" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-100 rounded-full blur-2xl opacity-70" />

          {/* Animated pulsing icon container */}
          <div className="relative mx-auto w-20 h-20 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 text-3xl mb-6 shadow-sm animate-bounce">
            <FiHeadphones />
            <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
            </span>
          </div>

          <span className="inline-block bg-orange-100 text-orange-600 text-xs font-extrabold tracking-wider uppercase px-3 py-1 rounded-full mb-4 animate-pulse">
            Coming Soon
          </span>

          <h2 className="text-2xl font-black text-slate-800 mb-3">Support & Help Desk</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            We are designing a state-of-the-art support portal featuring ticketing, live chat, and a robust knowledge base to assist you in resolving queries instantly.
          </p>

          {/* Quick contact slots */}
          <div className="space-y-3 mb-8">
            <div className="flex items-center gap-3 p-3.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-100 rounded-xl transition duration-200">
              <div className="text-slate-400 text-lg"><FiMail /></div>
              <div className="text-left">
                <p className="text-xs text-gray-400 font-semibold">Email Support</p>
                <p className="text-xs font-bold text-slate-700">support@itegmanagement.com</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-100 rounded-xl transition duration-200">
              <div className="text-slate-400 text-lg"><FiMessageSquare /></div>
              <div className="text-left">
                <p className="text-xs text-gray-400 font-semibold">Urgent Queries</p>
                <p className="text-xs font-bold text-slate-700">Submit request via HOD/Admin portal</p>
              </div>
            </div>
          </div>

          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-6 rounded-xl text-sm shadow-md hover:shadow-lg transition duration-200"
          >
            <FiArrowLeft size={16} />
            Go Back
          </button>
        </div>
      </div>
    </>
  );
};

export default Supportfile;