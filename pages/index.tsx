import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { put } from "@vercel/blob";
import { useRouter } from "next/router";

interface PriceData {
  high: number;
  low: number;
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const debug = process.env.NEXT_PUBLIC_DEBUG === "true";
  const [priceData, setPriceData] = useState<PriceData | null>(
    debug ? { high: 358.64, low: 138.8 } : null,
  );
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const router = useRouter();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [blobError, setBlobError] = useState(false);
  const [lastPriceData, setLastPriceData] = useState<PriceData | null>(null);

  useEffect(() => {
    const fetchPriceData = async () => {
      if (!debug) {
        try {
          const response = await fetch("/api/get-price");
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
      if (!canvas || !priceData) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // 设置画布大小
      canvas.width = 1540;
      canvas.height = 1540;

      // 绘制背景图像
      const background = new window.Image();
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
        ctx.fillText("52 week low", canvas.width / 1.2, canvas.height / 4 + 50);

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

        const dataUrl = canvas.toDataURL("image/png");
        setImageSrc(dataUrl); // 设置图片数据 URL
      };
    };

    drawCanvas();
  }, [priceData]);

  useEffect(() => {
    // 组件挂载时获取最新的 blob 图片
    const fetchLatestBlob = async () => {
      try {
        const response = await fetch("/api/get-latest-blob");
        if (!response.ok) throw new Error("Failed to fetch blob");
        const { url } = await response.json();
        if (url) setBlobUrl(url);
      } catch (error) {
        console.error("Error fetching blob:", error);
        setBlobError(true);
      }
    };

    fetchLatestBlob();
  }, []); // 仅在组件挂载时执行

  useEffect(() => {
    const uploadToBlob = async (dataUrl: string) => {
      try {
        const response = await fetch("/api/upload-blob", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            dataUrl,
            priceData,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to upload image");
        }

        const { url, isNewUpload } = await response.json();
        setBlobUrl(url);
        if (isNewUpload) {
          router.replace(router.asPath);
        }
      } catch (error) {
        console.error("Error uploading to blob:", error);
      }
    };

    if (imageSrc && priceData) {
      uploadToBlob(imageSrc);
    }
  }, [imageSrc, priceData, router]);

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-white">
      {blobUrl && !blobError ? (
        <Image
          src={blobUrl}
          alt="Stored Canvas Image"
          width={800}
          height={800}
          onError={() => setBlobError(true)}
        />
      ) : priceData && imageSrc ? (
        <Image src={imageSrc} alt="Canvas Image" width={800} height={800} />
      ) : (
        <canvas ref={canvasRef} className="hidden" />
      )}
      <div className="absolute text-bold text-black bottom-4 flex items-center justify-center w-full">
        Made with FOMO by&nbsp;
        <Link href="https://frad.me">
          <u>Frad</u>
        </Link>
      </div>
    </div>
  );
}
