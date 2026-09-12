import React from "react";
import { Composition, Sequence } from "remotion";
import { BgMesh, Grade, Grain, Vignette } from "./components/Effects";
import { SceneIntro } from "./components/SceneIntro";
import { SceneFeatured } from "./components/SceneFeatured";
import { SceneShowcase } from "./components/SceneShowcase";
import { SceneOutro } from "./components/SceneOutro";

export const CertificationsShowreelComp: React.FC = () => {
  return (
    <>
      {/* Layer 1: Background Mesh */}
      <BgMesh />

      {/* Layer 2 & 3: Content Scenes */}
      <Sequence from={0} durationInFrames={105}>
        <SceneIntro />
      </Sequence>

      <Sequence from={105} durationInFrames={120}>
        <SceneFeatured />
      </Sequence>

      <Sequence from={225} durationInFrames={120}>
        <SceneShowcase />
      </Sequence>

      <Sequence from={345} durationInFrames={105}>
        <SceneOutro />
      </Sequence>

      {/* Layer 4: Color Grade */}
      <Grade />

      {/* Layer 5: Procedural Grain & Vignette */}
      <Grain />
      <Vignette />
    </>
  );
};

export const Root: React.FC = () => {
  return (
    <Composition
      id="CertificationsShowreel"
      component={CertificationsShowreelComp}
      durationInFrames={450} // 15 seconds
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
