import { useEffect, useState } from 'react';
import { Avatar, type AvatarProps } from 'antd';
import { DEFAULT_AVATAR_URL, resolveAssetUrl } from '@/lib/assets';

interface AppAvatarProps extends Omit<AvatarProps, 'src'> {
  src?: string;
}

export default function AppAvatar({ src, children, ...props }: AppAvatarProps) {
  const resolvedSrc = resolveAssetUrl(src);
  const [currentSrc, setCurrentSrc] = useState(resolvedSrc);

  useEffect(() => {
    setCurrentSrc(resolvedSrc);
  }, [resolvedSrc]);

  return (
    <Avatar
      {...props}
      src={currentSrc}
      onError={() => {
        if (currentSrc !== DEFAULT_AVATAR_URL) {
          setCurrentSrc(DEFAULT_AVATAR_URL);
        }
        return false;
      }}
    >
      {children}
    </Avatar>
  );
}
