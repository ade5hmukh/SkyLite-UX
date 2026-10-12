<script setup lang="ts">
const props = defineProps<{
  title: string;
  icon: string | null;
  name: string;
}>();

const emit = defineEmits<{
  close: [];
}>();

const opened = ref(false);
const canClose = ref(false);
const timers: ReturnType<typeof setTimeout>[] = [];

function speak(text: string) {
  try {
    if (!window.speechSynthesis)
      return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }
  catch {
    // Reading aloud is optional.
  }
}

function playChime() {
  try {
    const context = new AudioContext();
    [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = frequency;
      oscillator.type = "triangle";
      const start = context.currentTime + index * 0.12;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.5);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.55);
    });
  }
  catch {
    // Sound is optional.
  }
}

function close() {
  if (canClose.value)
    emit("close");
}

const confetti = Array.from({ length: 40 }, (_, index) => ({
  left: `${Math.round(Math.random() * 100)}%`,
  delay: `${(Math.random() * 0.6).toFixed(2)}s`,
  color: ["#f472b6", "#facc15", "#60a5fa", "#4ade80", "#c084fc", "#fb923c"][index % 6],
}));

onMounted(() => {
  speak("Ooh, a present! Let's open it!");
  timers.push(setTimeout(() => {
    opened.value = true;
    playChime();
    speak(`Yay ${props.name}! You got ${props.title}!`);
  }, 1400));
  timers.push(setTimeout(() => (canClose.value = true), 2400));
  timers.push(setTimeout(() => emit("close"), 20000));
});

onBeforeUnmount(() => timers.forEach(clearTimeout));
</script>

<template>
  <div class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30" @click="close">
    <div v-if="!opened" class="gift-box text-[180px] leading-none select-none">
      🎁
    </div>
    <div v-else class="gift-reveal relative text-center text-white rounded-3xl shadow-2xl px-10 py-8 max-w-[90%] bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400">
      <span
        v-for="(emoji, index) in ['✨', '🎉', '⭐', '🎊', '💫', '🌟']"
        :key="index"
        :class="`burst burst-${index + 1}`"
      >{{ emoji }}</span>
      <h2 class="text-4xl font-black drop-shadow-lg">
        🎉 You got it! 🎉
      </h2>
      <div class="gift-icon mx-auto my-5 flex h-36 w-36 items-center justify-center rounded-full bg-white">
        <UIcon :name="icon || 'i-lucide-gift'" class="h-20 w-20 text-pink-500" />
      </div>
      <p class="text-3xl font-black drop-shadow-md">
        {{ title }}
      </p>
      <p class="mt-4 inline-flex items-center gap-2 rounded-2xl border-[3px] border-dashed border-white/80 px-4 py-2 text-lg font-bold">
        <UIcon name="i-lucide-ticket" class="h-6 w-6" />
        Your ticket is saved. Show a grown-up!
      </p>
      <div>
        <button
          type="button"
          class="mt-5 rounded-full bg-white px-10 py-3 text-2xl font-black text-pink-600"
          @click.stop="emit('close')"
        >
          Yay! ✓
        </button>
      </div>
    </div>
    <template v-if="opened">
      <span
        v-for="(piece, index) in confetti"
        :key="index"
        class="confetti"
        :style="{ left: piece.left, background: piece.color, animationDelay: piece.delay }"
      />
    </template>
  </div>
</template>

<style scoped>
.gift-box {
  animation: gift-shake 0.35s ease-in-out 4;
}
.gift-reveal {
  animation: bounce-in 0.8s ease-out;
}
.gift-icon {
  box-shadow: 0 0 0 10px rgb(255 255 255 / 0.35);
  animation: wiggle 0.8s ease-in-out 0.8s 2;
}
.burst {
  position: absolute;
  top: 50%;
  left: 50%;
  font-size: 48px;
  opacity: 0;
  animation: 1.2s ease-out forwards;
}
.burst-1 {
  animation-name: burst-1;
}
.burst-2 {
  animation-name: burst-2;
}
.burst-3 {
  animation-name: burst-3;
}
.burst-4 {
  animation-name: burst-4;
}
.burst-5 {
  animation-name: burst-5;
}
.burst-6 {
  animation-name: burst-6;
}
.confetti {
  position: fixed;
  top: -20px;
  width: 12px;
  height: 18px;
  border-radius: 3px;
  animation: confetti-fall 2.6s linear forwards;
}
@keyframes gift-shake {
  0%,
  100% {
    transform: rotate(0deg) scale(1);
  }
  25% {
    transform: rotate(-12deg) scale(1.05);
  }
  75% {
    transform: rotate(12deg) scale(1.05);
  }
}
@keyframes bounce-in {
  0% {
    opacity: 0;
    transform: scale(0.5);
  }
  50% {
    opacity: 1;
    transform: translateY(-30px) scale(1.05);
  }
  100% {
    transform: translateY(0) scale(1);
  }
}
@keyframes wiggle {
  0%,
  100% {
    transform: rotate(0deg);
  }
  25% {
    transform: rotate(-6deg) scale(1.05);
  }
  75% {
    transform: rotate(6deg) scale(1.05);
  }
}
@keyframes confetti-fall {
  0% {
    transform: translateY(0) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(110vh) rotate(720deg);
    opacity: 0.8;
  }
}
@keyframes burst-1 {
  0% {
    opacity: 1;
    transform: scale(0.5);
  }
  100% {
    opacity: 0;
    transform: translate(-220px, -200px) scale(1.4);
  }
}
@keyframes burst-2 {
  0% {
    opacity: 1;
    transform: scale(0.5);
  }
  100% {
    opacity: 0;
    transform: translate(220px, -200px) scale(1.4);
  }
}
@keyframes burst-3 {
  0% {
    opacity: 1;
    transform: scale(0.5);
  }
  100% {
    opacity: 0;
    transform: translate(-260px, 40px) scale(1.4);
  }
}
@keyframes burst-4 {
  0% {
    opacity: 1;
    transform: scale(0.5);
  }
  100% {
    opacity: 0;
    transform: translate(260px, 40px) scale(1.4);
  }
}
@keyframes burst-5 {
  0% {
    opacity: 1;
    transform: scale(0.5);
  }
  100% {
    opacity: 0;
    transform: translate(-140px, 230px) scale(1.4);
  }
}
@keyframes burst-6 {
  0% {
    opacity: 1;
    transform: scale(0.5);
  }
  100% {
    opacity: 0;
    transform: translate(140px, 230px) scale(1.4);
  }
}
</style>
