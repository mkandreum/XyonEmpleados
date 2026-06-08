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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
        <button className="absolute top-2 right-2 text-gray-500" onClick={onClose}>&times;</button>
        <h2 className="text-lg font-semibold mb-4">Firma para descargar reporte</h2>
        <canvas
          ref={canvasRef}
          width={400}
          height={150}
          className="border rounded w-full mb-4 touch-none bg-gray-50"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        <div className="flex justify-between">
          <button className="px-4 py-2 bg-gray-200 rounded" onClick={handleClear}>Limpiar</button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={handleConfirm}>Descargar</button>
        </div>
      </div>
    </div>
  );
};

export default SignatureModal;
