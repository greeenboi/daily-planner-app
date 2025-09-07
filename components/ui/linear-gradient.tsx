import { tva } from "@gluestack-ui/utils/nativewind-utils";
import {
	LinearGradient as ExpoLinearGradient,
	type LinearGradientProps,
} from "expo-linear-gradient";
import { cssInterop } from "nativewind";
import React from "react";

cssInterop(ExpoLinearGradient, { className: "style" });

const linearGradientStyle = tva({
	base: "",
});

export interface GSLinearGradientProps extends LinearGradientProps {
	className?: string;
}

export const LinearGradient = React.forwardRef<
	React.ComponentRef<typeof ExpoLinearGradient>,
	GSLinearGradientProps
>(({ className, ...props }, ref) => {
	return (
		<ExpoLinearGradient
			ref={ref}
			{...props}
			className={linearGradientStyle({ class: className })}
		/>
	);
});

LinearGradient.displayName = "LinearGradient";
