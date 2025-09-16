
import React from 'react';
import { Icon } from './Icon';

export const AchievementIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <Icon {...props}>
    <path d="M12.89 1.45l1.44 2.51-2.44.76-1.44-2.51.3-.53a2 2 0 0 1 2.14 0zM21 12.89l-2.51 1.44-.76-2.44 2.51-1.44a2 2 0 0 1 0 2.14l.53.3zM12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z"></path>
    <path d="M10.89 12.45l-2.44.76 1.44 2.51.3-.53a2 2 0 0 0 2.14 0l-1.44-2.51z"></path>
    <path d="M3 10.89l2.51-1.44.76 2.44-2.51 1.44a2 2 0 0 1 0-2.14l-.53-.3z"></path>
  </Icon>
);
