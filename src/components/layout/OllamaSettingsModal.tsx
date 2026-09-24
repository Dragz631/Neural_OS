import React, { useState } from 'react';
import { X, Cpu, CheckCircle2, AlertCircle, RefreshCw, Terminal } from 'lucide-react';
import { useNeural } from '../../context/NeuralContext';
import { ollamaService } from '../../services/ai/ollamaService';

interface OllamaSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OllamaSettingsModal: React.FC<OllamaSettingsModalProps> = ({ isOpen, onClose }) => {
  const { aiConfig, updateAIConfig } = useNeural();
  const [endpoint, setEndpoint] = useState(aiConfig.endpoint);
  const [model, setModel] = useState(aiConfig.selectedModel);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { online, models } = await ollamaService.checkHealth(endpoint);
      if (online) {
        updateAIConfig({
          endpoint,
          isOnline: true,
          availableModels: models,
          selectedModel: models.length > 0 && !models.includes(model) ? models[0] : model,
          lastChecked: new Date().toLocaleTimeString(),
        });
        setTestResult({
          success: true,
          message: `Conexão bem sucedida! ${models.length} modelo(s) detectado(s): ${models.join(', ')}`,
        });
      } else {
        updateAIConfig({
          endpoint,
          isOnline: false,
          lastChecked: new Date().toLocaleTimeString(),
        });
        setTestResult({
          success: false,
          message: `Ollama não respondeu em ${endpoint}. Certifique-se de que o aplicativo Ollama está aberto no seu PC.`,
        });
      }
    } catch {
      setTestResult({
        success: false,
        message: 'Erro ao tentar comunicação com o Ollama.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    updateAIConfig({
      endpoint,
      selectedModel: model,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg border-2 border-[#39ff14] bg-[#0a0b0d] p-6 text-[#9dc197] shadow-[0_0_30px_rgba(57,255,20,0.3)]"
      >
        {/* Title Bar */}
        <div className="flex items-center justify-between border-b border-[#3e5c38] pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-[#39ff14]" />
            <span className="font-mono text-sm font-bold tracking-widest text-[#39ff14]">
              // CONFIGURAÇÃO IA LOCAL (OLLAMA)
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="border border-[#3e5c38] p-1 text-[#9dc197] transition hover:border-red-500 hover:text-red-500"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 space-y-4 font-mono text-xs">
          {/* Status Indicator */}
          <div
            className={`flex items-center justify-between border p-3 ${
              aiConfig.isOnline
                ? 'border-[#39ff14]/50 bg-[#39ff14]/5 text-[#39ff14]'
                : 'border-yellow-500/50 bg-yellow-500/5 text-yellow-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full animate-pulse ${
                  aiConfig.isOnline ? 'bg-[#39ff14] shadow-[0_0_8px_rgba(57,255,20,0.9)]' : 'bg-yellow-400'
                }`}
              />
              <span className="font-bold">
                {aiConfig.isOnline ? 'OLLAMA CONECTADO & PRONTO' : 'MODO HEURÍSTICO ATIVO (OFFLINE)'}
              </span>
            </div>
            <span className="text-[10px] text-[#9dc197]/60">
              {aiConfig.lastChecked ? `Último teste: ${aiConfig.lastChecked}` : ''}
            </span>
          </div>

          {/* Endpoint Input */}
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-[#9dc197]/70">
              ENDPOINT DO OLLAMA (URL LOCAL)
            </label>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="http://localhost:11434"
                className="flex-1 border border-[#3e5c38] bg-[#0d0e12] px-3 py-2 text-[#39ff14] outline-none transition focus:border-[#39ff14] focus:shadow-[0_0_8px_rgba(57,255,20,0.4)]"
              />
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing}
                className="flex items-center gap-1.5 border border-[#39ff14] bg-[#39ff14]/10 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black disabled:opacity-50"
              >
                <RefreshCw size={12} className={testing ? 'animate-spin' : ''} />
                {testing ? 'TESTANDO...' : 'TESTAR'}
              </button>
            </div>
          </div>

          {/* Model Selector */}
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-[#9dc197]/70">
              MODELO DE IA ATIVO
            </label>
            {aiConfig.availableModels.length > 0 ? (
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="mt-1 w-full border border-[#3e5c38] bg-[#0d0e12] px-3 py-2 text-[#39ff14] outline-none transition focus:border-[#39ff14]"
              >
                {aiConfig.availableModels.map((m) => (
                  <option key={m} value={m} className="bg-[#0a0b0d] text-[#39ff14]">
                    {m}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="ex: deepseek-r1:8b, llama3, qwen2.5-coder:7b"
                className="mt-1 w-full border border-[#3e5c38] bg-[#0d0e12] px-3 py-2 text-[#39ff14] outline-none transition focus:border-[#39ff14]"
              />
            )}
          </div>

          {/* Test Feedback */}
          {testResult && (
            <div
              className={`flex items-start gap-2 border p-3 ${
                testResult.success
                  ? 'border-[#39ff14] bg-[#39ff14]/10 text-[#39ff14]'
                  : 'border-red-500 bg-red-950/20 text-red-400'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
              )}
              <p className="text-[11px] leading-relaxed">{testResult.message}</p>
            </div>
          )}

          {/* Quick Terminal Guide */}
          <div className="border border-[#3e5c38]/50 bg-[#090e0a] p-3 text-[10px] text-[#9dc197]/70">
            <div className="flex items-center gap-1 font-bold text-[#39ff14]">
              <Terminal size={12} /> COMO INICIAR O OLLAMA NO SEU TERMINAL:
            </div>
            <p className="mt-1">Abra seu terminal e execute um dos comandos abaixo para baixar o modelo:</p>
            <div className="mt-2 space-y-1 font-mono text-[#39ff14]">
              <div className="border border-[#3e5c38] bg-black px-2 py-1 select-all">
                ollama run deepseek-r1:8b
              </div>
              <div className="border border-[#3e5c38] bg-black px-2 py-1 select-all">
                ollama run qwen2.5-coder:7b
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="mt-6 flex justify-end gap-3 border-t border-[#3e5c38] pt-4 font-mono text-xs">
          <button
            type="button"
            onClick={onClose}
            className="border border-[#3e5c38] px-4 py-2 uppercase tracking-widest text-[#9dc197] transition hover:border-red-500 hover:text-red-500"
          >
            FECHAR
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="border border-[#39ff14] bg-[#39ff14] px-5 py-2 font-bold uppercase tracking-widest text-black shadow-[0_0_12px_rgba(57,255,20,0.5)] transition hover:bg-[#39ff14]/80"
          >
            SALVAR CONFIGURAÇÃO
          </button>
        </div>
      </div>
    </div>
  );
};
