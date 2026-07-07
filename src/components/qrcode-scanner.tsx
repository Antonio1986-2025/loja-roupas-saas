"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X, Camera, CameraOff, SwitchCamera, ZoomIn } from "lucide-react";

type Props = {
  onScan: (codigo: string) => void;
  onClose: () => void;
};

export function QrCodeScanner({ onScan, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const [iniciado, setIniciado] = useState(false);
  const [erro, setErro] = useState("");
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [cameraIdx, setCameraIdx] = useState(0);
  const ultimoCodigoRef = useRef("");
  const ultimoTempoRef = useRef(0);

  const pararScanner = useCallback(async () => {
    if (scannerRef.current && iniciado) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {
        // ignora erros ao parar
      }
    }
  }, [iniciado]);

  const iniciarScanner = useCallback(async (cameraId?: string) => {
    if (!containerRef.current) return;

    // Para o scanner anterior se existir
    if (scannerRef.current && iniciado) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch { /* ignora */ }
    }

    setErro("");
    setIniciado(false);

    try {
      // Import dinâmico para evitar problemas de SSR
      const { Html5Qrcode, Html5QrcodeScannerState } = await import("html5-qrcode");

      const scanner = new Html5Qrcode("qr-scanner-container");
      scannerRef.current = scanner;

      const config = {
        fps: 15,
        qrbox: { width: 260, height: 200 },
        aspectRatio: 1.4,
        supportedScanTypes: [0, 1], // QR e código de barras
      };

      // Pega a câmera selecionada ou a traseira por padrão
      const deviceId = cameraId ?? (cameras[cameraIdx]?.id);

      if (deviceId) {
        await scanner.start(
          deviceId,
          config,
          (decodedText) => handleScan(decodedText),
          undefined
        );
      } else {
        // Sem câmera específica — usa câmera traseira
        await scanner.start(
          { facingMode: "environment" },
          config,
          (decodedText) => handleScan(decodedText),
          undefined
        );
      }

      setIniciado(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("permission") || msg.includes("Permission")) {
        setErro("Permissão para câmera negada. Autorize o acesso nas configurações do navegador.");
      } else if (msg.includes("NotFound") || msg.includes("not found")) {
        setErro("Nenhuma câmera encontrada neste dispositivo.");
      } else {
        setErro(`Erro ao acessar câmera: ${msg}`);
      }
    }
  }, [cameras, cameraIdx, iniciado]);

  // Callback de scan com debounce — evita disparar múltiplas vezes para o mesmo código
  const handleScan = useCallback((codigo: string) => {
    const agora = Date.now();
    const codigoLimpo = codigo.trim();

    if (
      codigoLimpo === ultimoCodigoRef.current &&
      agora - ultimoTempoRef.current < 2000
    ) {
      return; // mesmo código nos últimos 2s — ignora
    }

    ultimoCodigoRef.current = codigoLimpo;
    ultimoTempoRef.current = agora;

    // Feedback visual/sonoro simples
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch { /* AudioContext pode não estar disponível */ }

    onScan(codigoLimpo);
  }, [onScan]);

  // Lista câmeras disponíveis ao montar
  useEffect(() => {
    let mounted = true;

    async function listarCameras() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const devs = await Html5Qrcode.getCameras();
        if (mounted && devs.length > 0) {
          setCameras(devs.map((d) => ({ id: d.id, label: d.label || `Câmera ${d.id.slice(0, 6)}` })));
          // Prefere câmera traseira (back/environment)
          const traseira = devs.findIndex(
            (d) => d.label.toLowerCase().includes("back") ||
                   d.label.toLowerCase().includes("traseira") ||
                   d.label.toLowerCase().includes("environment") ||
                   d.label.toLowerCase().includes("rear")
          );
          if (traseira >= 0) setCameraIdx(traseira);
        }
      } catch {
        // getCameras pode falhar antes de ter permissão — tudo bem, iniciarScanner cuida disso
      }
    }

    listarCameras();
    return () => { mounted = false; };
  }, []);

  // Inicia o scanner assim que o componente montar
  useEffect(() => {
    iniciarScanner();
    return () => {
      pararScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trocarCamera = async () => {
    const novoIdx = (cameraIdx + 1) % cameras.length;
    setCameraIdx(novoIdx);
    await pararScanner();
    await iniciarScanner(cameras[novoIdx]?.id);
  };

  const reiniciar = () => {
    iniciarScanner(cameras[cameraIdx]?.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-sm mx-4 rounded-2xl overflow-hidden bg-gray-900 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-800">
          <div className="flex items-center gap-2 text-white">
            <Camera className="h-4 w-4" />
            <span className="font-medium text-sm">Leitor de QR Code / Código de Barras</span>
          </div>
          <button
            onClick={async () => { await pararScanner(); onClose(); }}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Área do scanner */}
        <div className="relative bg-black" style={{ minHeight: 280 }}>
          {/* Container onde html5-qrcode renderiza o vídeo */}
          <div
            id="qr-scanner-container"
            ref={containerRef}
            className="w-full"
          />

          {/* Overlay com mira */}
          {iniciado && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-64 h-48">
                {/* Cantos da mira */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-green-400 rounded-tl-sm" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-green-400 rounded-tr-sm" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-green-400 rounded-bl-sm" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-green-400 rounded-br-sm" />
                {/* Linha de scan animada */}
                <div className="absolute inset-x-2 h-0.5 bg-green-400 opacity-80 scan-line" />
              </div>
            </div>
          )}

          {/* Estado de erro */}
          {erro && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 gap-4 p-6">
              <CameraOff className="h-12 w-12 text-red-400" />
              <p className="text-sm text-red-300 text-center">{erro}</p>
              <Button size="sm" variant="outline" onClick={reiniciar}>
                Tentar novamente
              </Button>
            </div>
          )}

          {/* Loading */}
          {!iniciado && !erro && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 gap-3">
              <div className="h-8 w-8 rounded-full border-2 border-green-400 border-t-transparent animate-spin" />
              <p className="text-sm text-gray-400">Iniciando câmera...</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-800 px-4 py-3">
          <p className="text-xs text-gray-400 text-center mb-2">
            Aponte a câmera para o código de barras ou QR Code do produto
          </p>

          <div className="flex gap-2 justify-center">
            {cameras.length > 1 && (
              <Button
                size="sm"
                variant="ghost"
                className="text-gray-300 hover:text-white hover:bg-gray-700 gap-1.5"
                onClick={trocarCamera}
              >
                <SwitchCamera className="h-3.5 w-3.5" />
                Trocar câmera
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="text-gray-300 hover:text-white hover:bg-gray-700"
              onClick={async () => { await pararScanner(); onClose(); }}
            >
              Fechar
            </Button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .scan-line {
          top: 50%;
          animation: scanAnimation 2s ease-in-out infinite;
        }
        @keyframes scanAnimation {
          0%, 100% { top: 10%; opacity: 1; }
          50% { top: 85%; opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
