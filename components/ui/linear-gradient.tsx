import React from 'react';
import { LinearGradient as ExpoLinearGradient, type LinearGradientProps } from 'expo-linear-gradient';
import { tva } from '@gluestack-ui/utils/nativewind-utils';
import { cssInterop } from 'nativewind';

cssInterop(ExpoLinearGradient, { className: 'style' });

const linearGradientStyle = tva({
  base: ''
});

export interface GSLinearGradientProps extends LinearGradientProps {
  className?: string;
}

export const LinearGradient = React.forwardRef<React.ComponentRef<typeof ExpoLinearGradient>, GSLinearGradientProps>(
  ({ className, ...props }, ref) => {
    return (
      <ExpoLinearGradient
        ref={ref}
        {...props}
        className={linearGradientStyle({ class: className })}
      />
    );
  }
);

LinearGradient.displayName = 'LinearGradient';
