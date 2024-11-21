import { useEffect, useRef, useMemo } from "react";
import Link from "next/link";

interface PriceData {
  high: number;
  low: number;
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const debug = process.env.NEXT_PUBLIC_DEBUG === "true";

  // Use useMemo to memoize priceData
  const priceData: PriceData = useMemo(() => {
    return debug ? { high: 358.64, low: 138.80 } : { high: 0, low: 0 };
  }, [debug]);

  useEffect(() => {
    const fetchPriceData = async () => {
      if (!debug) {
        try {
          const response = await fetch("/api/tsla-price");
          if (!response.ok) {
            console.error("Failed to fetch price data");
            return;
          }
          const data: PriceData = await response.json();
          if (canvasRef.current) {
            drawCanvas(data);
          }
        } catch (error) {
          console.error("Error fetching price data:", error);
        }
      } else if (canvasRef.current) {
        drawCanvas(priceData);
      }
    };

    const drawCanvas = (data: PriceData) => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          // 设置画布大小
          canvas.width = 1540;
          canvas.height = 1540;

          // 绘制背景图像
          const background = new Image();
          background.src = "/bg.png";
          background.onload = () => {
            ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

            // 绘制文本
            ctx.fillStyle = "#333";
            ctx.font = "bold 40px 'Comic Sans MS'";
            ctx.textAlign = "center";

            // 高价
            ctx.fillText("$TSLA", canvas.width / 1.78, canvas.height / 4);
            ctx.fillText(
              "52 week high",
              canvas.width / 1.78,
              canvas.height / 4 + 50,
            );
            ctx.fillText(
              `@${data.high.toFixed(2)}`,
              canvas.width / 1.78,
              canvas.height / 4 + 150,
            );

            // 低价
            ctx.fillText("$TSLA", canvas.width / 1.2, canvas.height / 4);
            ctx.fillText(
              "52 week low",
              canvas.width / 1.2,
              canvas.height / 4 + 50,
            );
            ctx.fillText(
              `@${data.low.toFixed(2)}`,
              canvas.width / 1.2,
              canvas.height / 4 + 150,
            );
          };
        }
      }
    };

    fetchPriceData();
  }, [debug, priceData]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <canvas ref={canvasRef} className="w-full max-w-4xl" />
      <div className="absolute text-bold text-black bottom-2 flex items-center justify-center w-full">
        Made with FOMO by&nbsp;
        <Link href="https://frad.me">
          <u>Frad</u>
        </Link>
      </div>
    </div>
  );
}