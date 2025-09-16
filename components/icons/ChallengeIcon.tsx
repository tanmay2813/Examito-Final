
import React from 'react';
import { Icon } from './Icon';

export const ChallengeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <Icon {...props}>
    <path d="m14.5 2-4 4 6 6-4 4 5.5 5.5"></path>
    <path d="m9.5 7 6 6"></path>
    <path d="m2 22 5.5-5.5"></path>
  </Icon>
);
