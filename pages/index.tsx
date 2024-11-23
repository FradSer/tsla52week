import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface PriceData {
  high: number;
  low: number;
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const debug = process.env.NEXT_PUBLIC_DEBUG === "true";
  const [priceData, setPriceData] = useState<PriceData>(
    debug ? { high: 358.64, low: 138.8 } : { high: 0, low: 0 }
  );

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
          setPriceData(data);
        } catch (error) {
          console.error("Error fetching price data:", error);
        }
      }
    };

    fetchPriceData();
  }, [debug]);

  useEffect(() => {
    const drawCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

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
        ctx.textAlign = "center";

        ctx.font = "bold 40px 'Comic Neue'";

        // 高价
        ctx.fillText("$TSLA", canvas.width / 1.78, canvas.height / 4);
        ctx.fillText(
          "52 week high",
          canvas.width / 1.78,
          canvas.height / 4 + 50,
        );

        // 低价
        ctx.fillText("$TSLA", canvas.width / 1.2, canvas.height / 4);
        ctx.fillText(
          "52 week low",
          canvas.width / 1.2,
          canvas.height / 4 + 50,
        );

        // 修改字体大小为 48px
        ctx.font = "bold 48px 'Comic Neue'";
        ctx.fillText(
          `@${priceData.high.toFixed(2)}`,
          canvas.width / 1.78,
          canvas.height / 4 + 160,
        );
        ctx.fillText(
          `@${priceData.low.toFixed(2)}`,
          canvas.width / 1.2,
          canvas.height / 4 + 160,
        );
      };
    };

    drawCanvas();
  }, [priceData]);

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-white">
      <canvas ref={canvasRef} className="w-full max-w-4xl" />
      <div className="absolute text-bold text-black bottom-4 flex items-center justify-center w-full">
        Made with FOMO by&nbsp;
        <Link href="https://frad.me">
          <u>Frad</u>
        </Link>
      </div>
    </div>
  );
}
