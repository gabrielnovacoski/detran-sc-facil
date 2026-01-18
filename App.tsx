
import React, { useState, useCallback, useEffect } from 'react';
import Header from './components/Header';
import ResultCard from './components/ResultCard';
import { VehicleData, ConsultationHistory } from './types';
import { consultPlate } from './services/api';

const App: React.FC = () => {
  const [plate, setPlate] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<VehicleData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notInBaseError, setNotInBaseError] = useState<boolean>(false);
  const [history, setHistory] = useState<ConsultationHistory[]>(() => {
    const saved = localStorage.getItem('detran_history');
    return saved ? JSON.parse(saved) : [
      { id: '1', plate: 'BRA2E24' },
      { id: '2', plate: 'ABC1D23' },
      { id: '3', plate: 'KGT5521' },
      { id: '4', plate: 'MHX0982' },
      { id: '5', plate: 'RLP3F44' },
    ];
  });

  useEffect(() => {
    localStorage.setItem('detran_history', JSON.stringify(history));
  }, [history]);

  const validatePlate = (value: string) => {
    const plateRegex = /^[A-Z0-9]{7}$/;
    if (!value) return 'Por favor, informe a placa do veículo.';
    if (value.length !== 7) return 'A placa deve conter exatamente 7 caracteres.';
    if (!plateRegex.test(value)) return 'A placa deve conter apenas letras e números.';
    return null;
  };

  const handleSearch = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const validationError = validatePlate(plate);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setNotInBaseError(false);

    try {
      const data = await consultPlate(plate);

      if (data.foundInDetranSC === false) {
        setNotInBaseError(true);
      } else {
        setResult(data);
        // Update history only for found vehicles or all? Let's update for all attempted searches
        setHistory(prev => {
          const filtered = prev.filter(h => h.plate !== data.plate);
          return [{ id: Date.now().toString(), plate: data.plate }, ...filtered].slice(0, 5);
        });
      }
    } catch (err) {
      setError('Erro ao consultar o sistema. Tente novamente em instantes.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [plate]);

  const handlePlateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setPlate(value);
    if (error) setError(null);
    if (notInBaseError) setNotInBaseError(false);
  };

  const handleClear = () => {
    setPlate('');
    setResult(null);
    setError(null);
    setNotInBaseError(false);
  };

  const handleHistoryClick = (historicPlate: string) => {
    setPlate(historicPlate);
    setError(null);
    setNotInBaseError(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark selection:bg-primary/20">
      <Header />

      <main className="w-full max-w-[800px] mx-auto px-4 py-6 md:py-10 flex-1">
        <div className="text-center mb-8">
          <h1 className="text-[#111318] dark:text-white tracking-tight text-2xl md:text-3xl font-black uppercase leading-tight">
            DETRAN SC FÁCIL
          </h1>
          <p className="text-[#616f89] dark:text-gray-400 mt-1 text-sm md:text-base font-medium">
            Consulta rápida de débitos e restrições
          </p>
        </div>

        <div className="bg-white dark:bg-[#1a212f] rounded-2xl shadow-xl shadow-black/5 border border-[#dbdfe6] dark:border-[#2a303c] p-5 md:p-8 mb-6">
          <form onSubmit={handleSearch} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[#111318] dark:text-white text-sm font-bold uppercase tracking-wider ml-1">
                Informar Placa
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  className={`form-input block w-full rounded-xl text-[#111318] dark:text-white dark:bg-[#101622] border-[#dbdfe6] dark:border-[#2a303c] focus:ring-4 focus:ring-primary/10 h-16 pl-5 pr-12 text-2xl font-black uppercase tracking-[0.2em] placeholder:text-gray-200 placeholder:normal-case placeholder:tracking-normal placeholder:font-medium transition-all ${error || notInBaseError ? 'border-red-500 focus:border-red-500' : 'focus:border-primary'}`}
                  placeholder="ABC1D23"
                  value={plate}
                  onChange={handlePlateChange}
                  maxLength={7}
                />
                <div className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors ${error || notInBaseError ? 'text-red-500' : 'text-primary/40'}`}>
                  <span className="material-symbols-outlined text-[28px]">{error || notInBaseError ? 'error' : 'search'}</span>
                </div>
              </div>
              {error && (
                <div className="flex items-center gap-1.5 text-red-500 text-xs font-bold mt-1.5 animate-in fade-in slide-in-from-top-1">
                  <span className="material-symbols-outlined text-[16px]">info</span>
                  {error}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center rounded-xl h-14 bg-primary text-white text-base font-black uppercase tracking-widest hover:bg-blue-700 active:scale-[0.98] transition-all shadow-lg shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <span>Consultar</span>
                )}
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="flex items-center justify-center rounded-xl h-14 bg-gray-100 dark:bg-[#2a303c] text-gray-600 dark:text-gray-300 text-base font-bold uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-[0.98] transition-all"
              >
                <span>Limpar</span>
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-10 space-y-4 animate-in fade-in duration-300">
              <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-widest">Acessando Detran NET...</p>
            </div>
          )}

          {notInBaseError && (
            <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-900/30 rounded-2xl p-6 text-center animate-in zoom-in duration-300">
              <span className="material-symbols-outlined text-red-600 dark:text-red-500 text-[48px] mb-3">report</span>
              <h2 className="text-red-700 dark:text-red-400 font-black text-sm uppercase tracking-widest leading-tight">
                CONSULTE NO APLICATIVO FISCALIZAÇÃO SENATRAN
              </h2>
              <p className="text-red-600 dark:text-red-300 font-bold text-xs mt-2 uppercase">
                VEÍCULO NÃO CONSTA NA BASE DO DETRAN SC
              </p>
              <button
                onClick={() => window.open('https://portalservicos.senatran.serpro.gov.br/', '_blank')}
                className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-colors"
              >
                Acessar Portal Senatran
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
              </button>
            </div>
          )}

          {result && !loading && !notInBaseError && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                <h2 className="text-[#111318] dark:text-white text-lg font-black uppercase tracking-tight">Resultado Encontrado</h2>
              </div>
              <ResultCard data={result} />
            </div>
          )}
        </div>

        <div className="mt-10 pt-6 border-t border-[#dbdfe6] dark:border-[#2a303c]">
          <h3 className="text-[#111318] dark:text-white text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">history</span>
            Buscas Recentes
          </h3>
          <div className="flex flex-wrap gap-2">
            {history.map((h) => (
              <button
                key={h.id}
                onClick={() => handleHistoryClick(h.plate)}
                className="px-4 py-2.5 bg-white dark:bg-[#1a212f] border border-[#dbdfe6] dark:border-[#2a303c] rounded-xl text-xs font-black text-primary hover:border-primary hover:bg-primary/5 active:scale-[0.95] transition-all uppercase tracking-widest"
              >
                {h.plate}
              </button>
            ))}
          </div>
        </div>
      </main>

      <footer className="py-8 text-center px-4">
        <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">
          Sistema Detran SC Fácil © 2024
        </p>
        <div className="mt-2 flex justify-center gap-4">
          <a href="https://sistema.detrannet.sc.gov.br/arearestrita/tela_principal.asp" target="_blank" className="text-[9px] text-primary font-bold uppercase underline underline-offset-2">
            Link Externo: DETRAN NET SC
          </a>
        </div>
      </footer>
    </div>
  );
};

export default App;
