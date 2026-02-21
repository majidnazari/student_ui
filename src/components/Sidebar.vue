<script setup>
import { useRoute } from "vue-router";

const route = useRoute();
const isActive = (path) => route.path === path;
</script>

<template>
  <div class="wrap">
    <div class="brand">Student Dashboard</div>

    <nav class="menu">
      <router-link class="item" :class="{active:isActive('/')}" to="/">خانه</router-link>

      <div class="sep">مدیریت پایه</div>
      <router-link class="item" :class="{active:isActive('/colleges')}" to="/colleges">دانشکده‌ها</router-link>
      <router-link class="item" :class="{active:isActive('/education-groups')}" to="/education-groups">گروه‌های آموزشی</router-link>
      <router-link class="item" :class="{active:isActive('/majors')}" to="/majors">رشته‌ها</router-link>
      <router-link class="item" :class="{active:isActive('/lessons')}" to="/lessons">درس‌ها</router-link>

      <div class="sep">مدیریت</div>
      <router-link class="item" :class="{active:isActive('/students')}" to="/students">دانشجوها</router-link>
      <router-link class="item" :class="{active:isActive('/terms')}" to="/terms">ترم‌ها (برای دانشجو)</router-link>

      <div class="sep">کارنامه</div>
      <router-link class="item" :class="{active:isActive('/term-results')}" to="/term-results">نمرات ترم دانشجو</router-link>
    </nav>
  </div>
</template>

<style scoped>
.wrap { padding: 14px; }
.brand { font-weight: 800; margin-bottom: 12px; }
.menu { display: grid; gap: 8px; }
.item {
  padding: 10px 12px;
  border-radius: 10px;
  text-decoration: none;
  color: #222;
  border: 1px solid #eee;
}
.item:hover { background: #fafafa; }
.item.active { border-color: #999; }
.sep { margin-top: 10px; font-size: 12px; color: #666; }
</style>