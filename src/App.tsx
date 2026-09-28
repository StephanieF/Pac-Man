import GameCanvas from "./game/GameCanvas";

export default function App() {
  return (
    <main className="app">
      <h1 className="sr-only">Pac-Man</h1>
      <GameCanvas />
      <footer className="app__footer">
        <p>Arrows / WASD to steer · Space to start</p>
        <p className="app__credits">
          Sprites: <a href="https://www.spriters-resource.com/atari_2600/pacman/asset/33529/">KingPepe</a> · Sounds:{" "}
          <a href="https://sounds.spriters-resource.com/atari_2600/pacman/asset/431332/">alexparr</a>
        </p>
      </footer>
    </main>
  );
}
