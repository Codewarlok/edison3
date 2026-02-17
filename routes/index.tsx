import { Head } from "fresh/runtime";
import { define } from "../utils.ts";

export default define.page(function Home(ctx) {
  console.log("Shared value " + ctx.state.shared);

  return (
    <div class="px-4 py-8 mx-auto fresh-gradient min-h-screen">
      <Head>
        <title>Fresh counter</title>
      </Head>
      <div class="max-w-screen-md mx-auto flex flex-col items-center justify-center">
        <img
          class="my-6"
          src="/logo.svg"
          width="128"
          height="128"
          alt="the Fresh logo: a sliced lemon dripping with juice"
        />
        <h1 class="text-4xl font-bold">Bienvenido loco</h1>
        <p class="my-4">
          Punto de entrada al sistema.
        </p>
        {/* <Counter count={count} /> */}
      </div>
    </div>
  );
});
