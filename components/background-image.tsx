import { Image } from "expo-image";

export default function BackgroundImage() {
	return (
		<Image
			source={require("../assets/background.png")}
			style={{
				position: "absolute",
				left: 0,
				right: 0,
				bottom: 0,
				width: "100%",
				height: "100%",
				zIndex: 0,
			}}
			contentFit="fill"
			pointerEvents="none"
		/>
	);
}
