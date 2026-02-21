<script setup>
import CrudTable from "../components/CrudTable.vue";
</script>

<template>
  <CrudTable
    title="دانشکده‌ها"
    resource="colleges"
    :fields="[
      { key: 'name', label: 'نام', type: 'text' },
    ]"
  />
</template>