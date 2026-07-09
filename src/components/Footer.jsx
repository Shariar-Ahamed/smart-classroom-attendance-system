import { Shield, Cpu, BookOpen } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-900/80 bg-slate-950/40 backdrop-blur-xl px-8 py-6 text-xs text-slate-500">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Academic Details */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <div className="font-bold text-slate-300">Department of Computer Science & Engineering</div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">Daffodil International University</div>
          </div>
        </div>

        {/* AI System Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-800">
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            <span className="font-mono text-slate-400 text-[10px]">FaceNet v1.7.13</span>
          </div>
          <div className="flex items-center gap-1.5 bg-emerald-500/5 px-2.5 py-1 rounded-lg border border-emerald-500/20 text-emerald-400 font-semibold select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            Biometric Secured
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-900/60 mt-4 pt-4 text-[10px] font-medium text-slate-600">
        <div>
          © {new Date().getFullYear()} SmartAttend System. All rights reserved.
        </div>
        <div className="flex items-center gap-1.5 select-none">
          <Shield className="w-3.5 h-3.5 text-slate-700" />
          <span>Complies with Academic Privacy Regulation</span>
        </div>
      </div>
    </footer>
  );
}
