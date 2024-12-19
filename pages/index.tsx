import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Head from "next/head";

interface PriceData {
  high: number;
  low: number;
  lastUpdated: number;
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const debug = process.env.NEXT_PUBLIC_DEBUG === "true";
  const [priceData, setPriceData] = useState<PriceData | null>(
    debug
      ? {
          high: 389.49,
          low: 138.8,
          lastUpdated: Date.now() - 8 * 60 * 60 * 1000, // Simulate old timestamp
        }
      : null,
  );
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [blobError, setBlobError] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    const fetchPriceData = async () => {
      if (debug) return; // Skip in debug mode

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
    };

    fetchPriceData();
  }, []);

  useEffect(() => {
    if (imageSrc && priceData) {
      setIsReady(true);
    }
  }, [imageSrc, priceData]);

  useEffect(() => {
    const checkAndUploadBlob = async () => {
      if (debug || !isReady) return; // Skip in debug mode or if not ready

      try {
        const { high, low, lastUpdated } = priceData!;
        const FOUR_HOURS = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
        const now = Date.now();

        if (now - lastUpdated > FOUR_HOURS) {
          console.log("Price data is outdated. Uploading new blob image...");

          const uploadResponse = await fetch("/api/upload-blob", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              dataUrl: imageSrc,
              priceData: { high, low },
            }),
          });

          const { url } = await uploadResponse.json();

          if (!uploadResponse.ok || !url) {
            console.error("Failed to upload image blob. Invalid response.");
            return;
          }

          console.log("Blob image uploaded successfully:", url);
          setBlobUrl(url);
        } else {
          console.log("Price data is up-to-date. No upload needed.");
        }
      } catch (error) {
        console.error("Error fetching price data or uploading blob:", error);
      }
    };

    checkAndUploadBlob();
  }, [isReady]); // Watch `isReady`

  useEffect(() => {
    const drawCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas || !priceData) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = 1540;
      canvas.height = 1540;

      const background = new window.Image();
      background.src = "/bg.png";
      background.onload = () => {
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#333";
        ctx.textAlign = "center";
        ctx.font = "bold 40px 'Comic Neue'";

        ctx.fillText("$TSLA", canvas.width / 1.78, canvas.height / 4);
        ctx.fillText(
          "52 week high",
          canvas.width / 1.78,
          canvas.height / 4 + 50,
        );

        ctx.fillText("$TSLA", canvas.width / 1.2, canvas.height / 4);
        ctx.fillText("52 week low", canvas.width / 1.2, canvas.height / 4 + 50);

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
        setImageSrc(dataUrl);
      };
    };

    drawCanvas();
  }, [priceData]);

  return (
    <>
      <Head>
        <title>TSLA 52 Week MEME</title>
        <meta
          name="description"
          content="Explore Tesla's 52-week high and low. Get the latest TSLA stock trends, analysis, and insights to make informed decisions."
        />
        <meta property="og:title" content="TSLA 52 Week MEME" />
        <meta
          property="og:description"
          content="Explore Tesla's 52-week highs and lows. Get the latest TSLA stock trends, analysis, and insights to make informed decisions."
        />
        <meta property="og:image" content={blobUrl || "/default-image.png"} />
        <meta property="og:url" content="https://tsla52week.com" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="TSLA 52 Week MEME" />
      </Head>
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
    </>
  );
}
