import Image from "next/image";

function isAbsoluteHttpUrl(src: string): boolean {
  return src.startsWith("https://") || src.startsWith("http://");
}

/** 站内路径走 next/image；外链走原生 img，避免为每个 AI 图床配 remotePatterns */
export function RemoteSafeFillImage({
  src,
  alt,
  className,
  sizes,
  priority,
}: {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  if (isAbsoluteHttpUrl(src)) {
    return (
      // 外链封面无法预知域名，不走 next/image 的 remotePatterns
      // eslint-disable-next-line @next/next/no-img-element -- 任意 https AI 图床
      <img
        src={src}
        alt={alt}
        className={className}
        loading={priority ? "eager" : "lazy"}
        sizes={sizes}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
    );
  }
  return (
    <Image src={src} alt={alt} fill className={className} sizes={sizes} priority={priority} />
  );
}
