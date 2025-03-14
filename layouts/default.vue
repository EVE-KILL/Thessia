<template>
    <div id="content" class="content flex flex-col mx-auto">
        <div id="inner-content" class="inner-content">
            <Navbar />
            <slot />
        </div>
    </div>
</template>

<style>
    @tailwind base;
    @tailwind components;
    @tailwind utilities;

    @layer base {
        :root {
            --background: 0 0% 100%;
            --foreground: 222.2 84% 4.9%;

            --muted: 210 40% 96.1%;
            --muted-foreground: 215.4 16.3% 46.9%;

            --popover: 0 0% 100%;
            --popover-foreground: 222.2 84% 4.9%;

            --card: 0 0% 100%;
            --card-foreground: 222.2 84% 4.9%;

            --border: 214.3 31.8% 91.4%;
            --input: 214.3 31.8% 91.4%;

            --primary: 222.2 47.4% 11.2%;
            --primary-foreground: 210 40% 98%;

            --secondary: 210 40% 96.1%;
            --secondary-foreground: 222.2 47.4% 11.2%;

            --accent: 210 40% 96.1%;
            --accent-foreground: 222.2 47.4% 11.2%;

            --destructive: 0 72.2% 50.6%;
            --destructive-foreground: 210 40% 98%;

            --ring: 222.2 84% 4.9%;

            --radius: 0.5rem;
        }
    }

    html,
    body {
        height: 100%;
        margin: 0;
        margin-top: 10px;
        font-family: 'Shentox', sans-serif;
        font-size: 1.1em;
        color: white;
    }

    html {
        background:
            /* top, transparent black, faked with gradient */
            linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5));
            background: url('/files/images/bg.png') no-repeat center fixed, radial-gradient(circle, transparent, black 80%);
            background-size: cover;
            background-color: black;
    }

    /* Vignette effect */
    html::before {
        content: '';
        position: fixed;
        inset: 0;
        background: radial-gradient(circle, transparent, black 90%);
        pointer-events: none;
        z-index: -1;
    }

    body {
        display: flex;
        flex-direction: column;
        min-height: 100%;
    }

    *::-webkit-scrollbar {
        width: 10px;
    }

    *::-webkit-scrollbar-track {
        background-color: transparent;
    }

    *::-webkit-scrollbar-thumb {
        background-color: var(--color-primary-400);
        border-radius: 10px;
        /* border: 2px solid #2c2c35; */
    }

	.content {
		max-width: 90rem;
		background-color: rgba(21, 21, 21, 0.5);
		border: 2px solid #252525;
		padding: 5px;
		border-radius: 10px;
	}

	#content > #inner-content {
		display: block;
		border: 5px solid rgba(0, 0, 0, 0.5);
		padding: 0px 20px 20px 20px;
		background: rgba(0, 0, 0, 0.65);
		margin-bottom: 5px;
	}
</style>
