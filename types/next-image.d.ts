declare module 'next/image' {
  import { StaticImageData } from 'next/dist/shared/lib/image-external';
  
  interface StaticRequire {
    default: StaticImageData;
  }

  type StaticImport = StaticImageData | StaticRequire;
  
  type ImageProps = {
    src: string | StaticImport;
    alt: string;
    width?: number;
    height?: number;
    layout?: 'fixed' | 'intrinsic' | 'responsive' | 'fill';
    loader?: (resolverProps: ImageLoaderProps) => string;
    quality?: number | string;
    priority?: boolean;
    loading?: 'lazy' | 'eager';
    placeholder?: 'blur' | 'empty';
    blurDataURL?: string;
    unoptimized?: boolean;
    objectFit?: 'fill' | 'contain' | 'cover' | 'none' | 'scale-down';
    objectPosition?: string;
    onLoadingComplete?: (result: { naturalWidth: number; naturalHeight: number }) => void;
    onError?: (error: Error) => void;
  };

  interface ImageLoaderProps {
    src: string;
    width: number;
    quality?: number;
  }

  export default function Image(props: ImageProps): JSX.Element;
}