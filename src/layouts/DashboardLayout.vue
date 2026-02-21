<script setup>
import Sidebar from "../components/Sidebar.vue";
</script>

<template>
  <div class="layout">
    <aside class="sidebar">
      <Sidebar />
    </aside>

    <main class="content">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.layout {
  direction: rtl;
  display: grid;
  grid-template-columns: 260px 1fr;
  min-height: 100vh;
  background: #f5f6fa;
  font-family: Arial, sans-serif;
}
.sidebar {
  background: white;
  border-left: 1px solid #eee;
}
.content {
  padding: 16px;
}
@media (max-width: 900px) {
  .layout { grid-template-columns: 1fr; }
  .sidebar { border-left: 0; border-bottom: 1px solid #eee; }
}
</style>