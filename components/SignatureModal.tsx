import React, { useRef } from 'react';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (signatureDataUrl: string) => void;
}

const SignatureModal: React.FC<SignatureModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  let drawing = false;

  const startDrawing = (e: React.TouchEvent | React.MouseEvent) => {
    drawing = true;
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      const { x, y } = getPointerPosition(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!drawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      const { x, y } = getPointerPosition(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    drawing = false;
  };

  const getPointerPosition = (e: any) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    let x = 0, y = 0;
    if (e.touches && e.touches[0]) {
      x = e.touches[0].clientX - (rect?.left || 0);
      y = e.touches[0].clientY - (rect?.top || 0);
    } else {
      x = e.clientX - (rect?.left || 0);
      y = e.clientY - (rect?.top || 0);
    }
    return { x, y };
  };

  const handleClear = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const handleConfirm = () => {
    if (canvasRef.current) {
      onConfirm(canvasRef.current.toDataURL('image/png'));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label="Firma para descargar reporte" className="modal-panel max-w-md p-6 relative animate-scale-in">
        <button className="absolute top-3 right-3 p-2 rounded-control text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800" onClick={onClose} aria-label="Cerrar">&times;</button>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1 pr-8">Firma para descargar el reporte</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Dibuja tu firma en el recuadro.</p>
        <canvas
          ref={canvasRef}
          width={400}
          height={150}
          aria-label="Área de firma"
          className="border border-slate-300 dark:border-slate-600 rounded-control w-full mb-4 touch-none bg-white"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        <div className="flex justify-between gap-3">
          <button className="btn-secondary" onClick={handleClear}>Limpiar</button>
          <button className="btn-primary" onClick={handleConfirm}>Descargar</button>
        </div>
      </div>
    </div>
  );
};

export default SignatureModal;
