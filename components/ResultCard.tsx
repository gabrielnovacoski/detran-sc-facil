
import React from 'react';
import { VehicleData } from '../types';

interface ResultCardProps {
  data: VehicleData;
}

const ResultCard: React.FC<ResultCardProps> = ({ data }) => {


  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };



  return (
    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Main Vehicle Card */}
      <div className="bg-white dark:bg-[#1a212f] rounded-2xl shadow-lg border border-[#dbdfe6] dark:border-[#2a303c] overflow-hidden">
        <div className="bg-primary/5 dark:bg-primary/10 px-5 py-3 border-b border-primary/10 flex justify-between items-center">
          <div className="flex items-center gap-2 text-primary">
            <span className="material-symbols-outlined text-[20px] font-bold">verified</span>
            <span className="font-black text-sm uppercase tracking-wider">{data.plate}</span>
          </div>
          <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest">
            {data.lastUpdate}
          </span>
        </div>

        <div className="p-5 md:p-6 space-y-5">
          <div className="grid grid-cols-2 gap-x-4 gap-y-5">
            <div className="col-span-2">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Veículo</p>
              <p className="text-sm font-bold text-[#111318] dark:text-white leading-tight">{data.model}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Município</p>
              <p className="text-sm font-bold text-[#111318] dark:text-white leading-tight">{data.municipality}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Licenciado</p>
              <p className="text-sm font-bold text-[#111318] dark:text-white leading-tight">{data.licensingYear}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Cor</p>
              <p className="text-sm font-bold text-[#111318] dark:text-white leading-tight">{data.color}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Restrições</p>
              <div className={`flex items-center gap-1 text-[11px] font-black uppercase ${data.hasRestrictions ? 'text-amber-600' : 'text-green-600'}`}>
                <span className="material-symbols-outlined text-[14px]">{data.hasRestrictions ? 'warning' : 'check_circle'}</span>
                {data.restrictions}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-[#2a303c]">
            <div className="bg-gray-50 dark:bg-[#101622] p-4 rounded-xl border border-gray-100 dark:border-transparent flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Total de Débitos</p>
                <p className={`text-xl font-black ${data.totalDebts > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(data.totalDebts)}
                </p>
              </div>

            </div>
          </div>
        </div>
      </div>



      <div className="p-4 bg-amber-50/50 dark:bg-amber-900/10 border-t border-amber-100 dark:border-amber-900/20">
        <p className="text-[9px] text-amber-800 dark:text-amber-500 font-bold uppercase tracking-wider leading-relaxed text-center">
          ⚠️ Emita as guias oficiais no site do DETRAN NET SC.
        </p>
      </div>
    </div >
  )
}


export default ResultCard;
