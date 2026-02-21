<script setup>
import CrudTable from "../components/CrudTable.vue";
</script>

<template>
  <CrudTable
    title="گروه‌های آموزشی"
    resource="education-groups"
    :fields="[
      { key: 'name', label: 'نام', type: 'text' },
    ]"
  />
</template>