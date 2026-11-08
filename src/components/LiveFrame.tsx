import { useEffect, useState } from 'react';

interface LiveFrameProps {
  frameURL: string;
  alt: string;
}

export function LiveFrame({ frameURL, alt }: LiveFrameProps) {
  const [shownURL, setShownURL] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    const preloader = new Image();
    preloader.onload = () => {
      if (isCurrent) setShownURL(frameURL);
    };
    preloader.src = frameURL;
    return () => {
      isCurrent = false;
    };
  }, [frameURL]);

  if (!shownURL) return <div className='aspect-video w-full bg-muted' />;
  return <img src={shownURL} alt={alt} className='aspect-video w-full object-cover' />;
}
