import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

// MARK: - Types & Interfaces
interface PriceData {
high: number;
low: number;
lastUpdated: number;
}

interface CanvasConfig {
width: number;
height: number;
positions: {
  high: number;
  low: number;
};
}

interface MetaConfig {
title: string;
description: string;
domain: string;
}

interface LoadingState {
isLoading: boolean;
error: string | null;
}

// MARK: - Constants
const UPDATE_INTERVAL = 4 * 60 * 60 * 1000; // 4 hours in milliseconds

const CANVAS_CONFIG: CanvasConfig = {
  width: 1540,
  height: 1540,
  positions: {
    high: 1540 / 1.78, // Pre-calculated for better performance
    low: 1540 / 1.2,
  },
};

const META_CONFIG: MetaConfig = {
  title: "TSLA 52 Week MEME",
  description:
    "Explore Tesla's 52-week high and low. Get the latest TSLA stock trends, analysis, and insights to make informed decisions.",
  domain: "https://www.tsla52week.com",
};

// MARK: - Main Component
/**
 * Home component for displaying Tesla stock price visualization
 * Handles canvas drawing, price data fetching, and image blob management
 * @returns {JSX.Element} The rendered component
 */
export default function Home() {
  // MARK: - Refs & State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);

  const isDebug = process.env.NEXT_PUBLIC_DEBUG === "true";
  const [priceData, setPriceData] = useState<PriceData | null>(
    isDebug
      ? {
          high: 389.49,
          low: 138.8,
          lastUpdated: Date.now() - 8 * 60 * 60 * 1000,
        }
      : null,
  );
  const [canvasImageUrl, setCanvasImageUrl] = useState<string | null>(null);
  const [storedImageUrl, setStoredImageUrl] = useState<string | null>(null);
  const [hasImageLoadError, setHasImageLoadError] = useState(false);
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    error: null
  });
  const [isContentReady, setIsContentReady] = useState(false);

  // MARK: - Data Fetching
  /**
   * Fetches the latest stored image blob from the API
   * Updates storedImageUrl state and handles potential errors
   */
  const fetchLatestStoredImage = async () => {
    setLoadingState({ isLoading: true, error: null });
    try {
      const response = await fetch("/api/get-latest-blob");
      if (!response.ok) throw new Error("Failed to fetch stored image");

      const { url } = await response.json();
      if (url) setStoredImageUrl(url);
    } catch (error) {
      console.error("Error fetching stored image:", error);
      setHasImageLoadError(true);
    } finally {
      setLoadingState({ isLoading: false, error: null });
    }
  };

  /**
   * Fetches current TSLA price data from API
   * Updates priceData state with latest high/low values
   */
  const fetchCurrentPrices = useCallback(async () => {
    if (isDebug) return;

    try {
      const response = await fetch("/api/get-price");
      if (!response.ok) throw new Error("Failed to fetch price data");

      const data: PriceData = await response.json();
      setPriceData(data);
    } catch (error) {
      console.error("Error fetching price data:", error);
    }
  }, [isDebug]);

  // MARK: - Canvas Operations
  /**
   * Renders price information text on the canvas
   * @param ctx - Canvas rendering context
   * @param data - Current price data to display
   * @param canvas - Canvas element reference
   */
  const renderPriceInformation = (
    ctx: CanvasRenderingContext2D,
    data: PriceData,
    canvas: HTMLCanvasElement,
  ) => {
    ctx.fillStyle = "#333";
    ctx.textAlign = "center";

    // Draw title sections
    ctx.font = "bold 40px 'Comic Neue'";
    Object.entries(CANVAS_CONFIG.positions).forEach(([type, xPosition]) => {
      ctx.fillText("$TSLA", xPosition, canvas.height / 4);
      ctx.fillText(`52 week ${type}`, xPosition, canvas.height / 4 + 50);
    });

    // Draw price values
    ctx.font = "bold 48px 'Comic Neue'";
    ctx.fillText(
      `@${data.high.toFixed(2)}`,
      CANVAS_CONFIG.positions.high,
      canvas.height / 4 + 160,
    );
    ctx.fillText(
      `@${data.low.toFixed(2)}`,
      CANVAS_CONFIG.positions.low,
      canvas.height / 4 + 160,
    );
  };

  /**
   * Handles canvas drawing lifecycle including background image and price text
   * Updates canvas image URL state when complete
   */
  const updateCanvasContent = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !priceData) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setLoadingState({ isLoading: false, error: "Failed to get canvas context" });
      return;
    }
    setLoadingState({ isLoading: true, error: null });

    // Setup canvas dimensions
    canvas.width = CANVAS_CONFIG.width;
    canvas.height = CANVAS_CONFIG.height;

    // Load or use cached background image
    const backgroundImage = bgImageRef.current;
    if (!backgroundImage) {
      const newImage = new window.Image();
      newImage.src = "/bg.png";
      newImage.onload = () => {
        bgImageRef.current = newImage;
        updateCanvasContent();
        setLoadingState({ isLoading: false, error: null });
      };
      return;
    }

    // Render canvas elements
    ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
    renderPriceInformation(ctx, priceData, canvas);

    setCanvasImageUrl(canvas.toDataURL("image/png"));
    setLoadingState({ isLoading: false, error: null });
  }, [priceData]);

  // MARK: - Effects
  useEffect(() => {
    fetchCurrentPrices();
  }, [fetchCurrentPrices]);

  useEffect(() => {
    fetchLatestStoredImage();
  }, [isDebug]);

  useEffect(() => {
    if (canvasImageUrl && priceData) setIsContentReady(true);
  }, [canvasImageUrl, priceData, setIsContentReady]);

  // Throttled canvas update
  const throttledUpdateCanvas = useCallback(() => {
    let lastCall = 0;
    const delay = 1000; // 1 second delay
    
    const now = Date.now();
    if (now - lastCall >= delay) {
      updateCanvasContent();
      lastCall = now;
    }
  }, [updateCanvasContent]);

  useEffect(() => {
    throttledUpdateCanvas();
  }, [throttledUpdateCanvas]);

  /**
   * Handles automatic image blob upload when conditions are met
   * Only uploads if enough time has passed since last update
   */
  useEffect(() => {
    const uploadCanvasImage = async () => {
      if (isDebug || !isContentReady || !priceData || !canvasImageUrl) return;

      const { high, low, lastUpdated } = priceData;
      if (Date.now() - lastUpdated <= UPDATE_INTERVAL) return;

      try {
        const response = await fetch("/api/upload-blob", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dataUrl: canvasImageUrl,
            priceData: { high, low },
          }),
        });

        const { url } = await response.json();
        if (!response.ok || !url) throw new Error("Image upload failed");

        setStoredImageUrl(url);
      } catch (error) {
        console.error("Error uploading image:", error);
      }
    };

    uploadCanvasImage();
  }, [isContentReady, priceData, isDebug, canvasImageUrl]);

  // MARK: - Render Methods
  return (
    <>
      <Head>
        <title>{META_CONFIG.title}</title>
        <meta name="description" content={META_CONFIG.description} />
        <meta property="og:title" content={META_CONFIG.title} />
        <meta property="og:description" content={META_CONFIG.description} />
        <meta property="og:image" content={`${META_CONFIG.domain}/api/og`} />
        <meta property="og:url" content="https://tsla52week.com" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={META_CONFIG.title} />
        <meta
          property="twitter:image"
          content={`${META_CONFIG.domain}/api/og`}
        />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content={META_CONFIG.title} />
        <meta
          property="twitter:description"
          content="Made with FOMO by @FradSer"
        />
      </Head>

      <div className="relative flex items-center justify-center min-h-screen bg-white">
        {!priceData ? (
          <div className="flex flex-col items-center justify-center">
            <div className="loading-text">
              Loading $TSLA<span className="dots">...</span>
            </div>
            <div className="handwriting-animation">Getting latest prices</div>
          </div>
        ) : loadingState.isLoading ? (
          <div className="flex flex-col items-center justify-center">
            <div className="loading-text">
              Drawing meme<span className="dots">...</span>
            </div>
            <div className="handwriting-animation">with FOMO</div>
          </div>
        ) : loadingState.error ? (
          <div className="text-red-500 p-4 rounded-lg bg-red-50 border border-red-200">
            <p>{loadingState.error}</p>
          </div>
        ) : storedImageUrl && !hasImageLoadError ? (
          <Image
            src={storedImageUrl || ''}
            alt="Stored Price Visualization"
            width={800}
            height={800}
            onError={() => setHasImageLoadError(true)}
          />
        ) : priceData && canvasImageUrl ? (
          <Image
            src={canvasImageUrl || ''}
            alt="Live Price Visualization"
            width={800}
            height={800}
          />
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
