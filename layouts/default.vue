<template>
  <UContainer id="content" class="content mx-auto">
    <div id="inner-content" class="inner-content">
      <Navbar />
      <main class="main-content">
        <slot />
      </main>
      <Footer />
    </div>
  </UContainer>

  <BackgroundViewer />
</template>

<script setup lang="ts">

</script>

<style>
/* Root CSS variables for theme colors and backgrounds */
:root {
  --bg-image-url: url('/backgrounds/images/bg2.png');
  --bg-video-url: none;
  --bg-image-display: block;
  --bg-video-display: none;
}

html,
body {
  height: 100%;
  margin: 0;
  font-family: 'Shentox', sans-serif;
  font-size: 1.1em;
  color: black;
}

html.dark,
html.dark body {
  color: white;
}

/* Base background styles with dynamic image */
html {
  background-color: black !important;
  background-image: var(--bg-image-url) !important;
  background-repeat: no-repeat !important;
  background-position: center !important;
  background-attachment: fixed !important;
  background-size: cover !important;
  position: relative;
  min-height: 100%;
  overflow-y: scroll;
  scrollbar-gutter: stable;
}

/* Dark mode background */
html.dark {
  background-color: black;
}

/* Vignette effect - Light mode version */
html::before {
  content: '';
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: radial-gradient(circle, transparent, white 95%);
  pointer-events: none;
  z-index: 0;
}

/* Dark mode vignette */
html.dark::before {
  background: radial-gradient(circle, transparent, black 95%);
}

body {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  position: relative;
  z-index: 1;
  background-color: transparent;
  padding-right: 0 !important;
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
}

.content {
  max-width: 80rem;
  background-color: rgba(245, 245, 245, 0.7) !important;
  border-left: 2px solid #e5e5e5;
  border-right: 2px solid #e5e5e5;
  padding: 5px 5px 0px 5px;
  min-height: 100vh;
  width: 100%;
}

html.dark .content {
  background-color: rgba(21, 21, 21, 0.7) !important;
  border-left: 2px solid #252525;
  border-right: 2px solid #252525;
}

#content>#inner-content {
  display: grid; /* Using grid instead of flex */
  grid-template-rows: auto 1fr auto; /* Header, content, footer */
  padding: 5px 5px 0 5px;
  background: rgba(255, 255, 255, 0.25);
  min-height: 100vh;
}

/* Main content area styling */
.main-content {
  padding-bottom: 20px; /* Add space above footer */
}

@media (min-width: 768px) {
  #content>#inner-content {
    padding-right: 5px;
    padding-left: 25px;
  }
}

html.dark #content>#inner-content {
  background: rgba(0, 0, 0, 0.80);
}

html #content>#inner-content {
  background: rgba(255, 255, 255, 0.80);
}

/* Mobile-specific adjustments */
@media (max-width: 767px) {
  .content {
    border-left: none;
    border-right: none;
  }

  html.dark .content {
    border-left: none;
    border-right: none;
  }
}

/* Add padding top to content to account for fixed navbar */
#inner-content {
  padding-top: 1rem; /* Reduced padding since sticky takes its own space */
}
</style>
