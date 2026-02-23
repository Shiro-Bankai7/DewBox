import { motion } from "framer-motion";
import { Home, PiggyBank, Target, TrendingUp, User, Wallet } from "lucide-react";

const iPhone16Mockup = ({ variant = "home" }) => {
  const screens = {
    home: (
      <div className="relative h-full bg-slate-50 overflow-hidden pb-12">
        <div className="bg-white border-b border-slate-200 px-3 pt-2 pb-1.5 flex items-center justify-between">
          <span className="text-[6px] font-semibold text-slate-900">9:41</span>
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-3 rounded-sm border border-slate-900">
              <div className="m-[1px] h-[2px] rounded-[1px] bg-slate-900" />
            </div>
          </div>
        </div>

        <div className="px-3 py-2 bg-white border-b border-slate-200">
          <h3 className="text-[7px] font-semibold text-slate-900">Welcome back, member</h3>
          <p className="text-[5px] text-slate-500">Contribution dashboard overview</p>
        </div>

        <div className="p-2 space-y-1.5">
          <div className="rounded-lg bg-blue-700 p-2.5 text-white border border-blue-800">
            <div className="flex items-center gap-1 text-[5px] text-blue-100">
              <Wallet size={8} />
              Wallet balance
            </div>
            <p className="mt-1 text-[12px] font-bold">NGN 125,450</p>
            <div className="mt-2 grid grid-cols-2 gap-1">
              <button className="rounded-md border border-blue-500 bg-blue-600 py-1 text-[5px] font-medium">
                Add money
              </button>
              <button className="rounded-md border border-blue-500 bg-blue-600 py-1 text-[5px] font-medium">
                Contribute
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <div className="rounded-lg border border-amber-200 bg-white p-2">
              <div className="flex items-center gap-1">
                <PiggyBank className="text-amber-600" size={8} />
                <span className="text-[4px] text-slate-500">Piggy</span>
              </div>
              <p className="mt-1 text-[8px] font-semibold text-slate-900">NGN 45,800</p>
              <div className="mt-1 h-0.5 rounded-full bg-slate-200">
                <div className="h-full w-[60%] rounded-full bg-amber-500" />
              </div>
            </div>

            <div className="rounded-lg border border-blue-200 bg-white p-2">
              <div className="flex items-center gap-1">
                <Target className="text-blue-700" size={8} />
                <span className="text-[4px] text-slate-500">ICA</span>
              </div>
              <p className="mt-1 text-[8px] font-semibold text-slate-900">NGN 180,000</p>
              <div className="mt-1 h-0.5 rounded-full bg-slate-200">
                <div className="h-full w-[80%] rounded-full bg-blue-700" />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-2">
            <div className="flex items-center justify-between">
              <span className="text-[5px] text-slate-500">Recent activity</span>
              <TrendingUp className="text-green-600" size={7} />
            </div>
            <div className="mt-1 space-y-1">
              <div className="flex items-center justify-between rounded-md bg-slate-50 px-1.5 py-1">
                <span className="text-[5px] text-slate-700">Piggy contribution</span>
                <span className="text-[5px] font-semibold text-green-700">+ NGN 5,000</span>
              </div>
              <div className="flex items-center justify-between rounded-md bg-slate-50 px-1.5 py-1">
                <span className="text-[5px] text-slate-700">ICA contribution</span>
                <span className="text-[5px] font-semibold text-green-700">+ NGN 15,000</span>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 bg-white px-3 py-1.5">
          <div className="flex items-center justify-around">
            <div className="flex flex-col items-center gap-0.5">
              <Home size={9} className="text-blue-700" />
              <span className="text-[4px] font-medium text-blue-700">Home</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <TrendingUp size={9} className="text-slate-400" />
              <span className="text-[4px] text-slate-400">Contribute</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <Wallet size={9} className="text-slate-400" />
              <span className="text-[4px] text-slate-400">Wallet</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <User size={9} className="text-slate-400" />
              <span className="text-[4px] text-slate-400">Profile</span>
            </div>
          </div>
        </div>
      </div>
    ),
  };

  return (
    <div className="w-full flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: [0, -2, 0] }}
        transition={{ duration: 3, repeat: Infinity, repeatType: "mirror" }}
        className="relative rounded-[2.8rem] border border-slate-500 bg-[#171b22] p-[6px] shadow-[0_20px_42px_rgba(15,23,42,0.3)]"
        style={{ width: "min(100%, 208px)", aspectRatio: "9 / 19.5" }}
      >
        <div className="absolute -left-[3px] top-[22%] h-10 w-[3px] rounded-r-md bg-slate-400" />
        <div className="absolute -right-[3px] top-[20%] h-12 w-[3px] rounded-l-md bg-slate-400" />
        <div className="absolute -right-[3px] top-[33%] h-9 w-[3px] rounded-l-md bg-slate-400" />
        <div className="absolute left-1/2 top-2.5 z-20 h-5 w-20 -translate-x-1/2 rounded-full bg-black flex items-center justify-center">
          <div className="h-1.5 w-1.5 rounded-full bg-slate-600" />
        </div>
        <div className="relative h-full overflow-hidden rounded-[2.35rem] border border-slate-300 bg-white">
          {screens[variant] || screens.home}
        </div>
      </motion.div>
    </div>
  );
};

export default iPhone16Mockup;
