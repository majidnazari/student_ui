<script setup>
import CrudTable from "../components/CrudTable.vue";
</script>

<template>
  <CrudTable
    title="رشته‌ها"
    resource="majors"
    :fields="[
      { key: 'education_group_id', label: 'ID گروه آموزشی', type: 'number' },
      { key: 'name', label: 'نام', type: 'text' },
    ]"
  />
</template>