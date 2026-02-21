<script setup>
import CrudTable from "../components/CrudTable.vue";
</script>

<template>
  <CrudTable
    title="درس‌ها"
    resource="lessons"
    :fields="[
      { key: 'code', label: 'کد', type: 'text' },
      { key: 'name', label: 'نام', type: 'text' },
      { key: 'unit', label: 'واحد', type: 'number' },
    ]"
  />
</template>