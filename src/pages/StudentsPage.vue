<script setup>
import CrudTable from "../components/CrudTable.vue";
</script>

<template>
  <CrudTable
    title="دانشجوها"
    resource="students"
    :fields="[
      { key: 'college_id', label: 'College ID', type: 'number' },
      { key: 'education_group_id', label: 'EducationGroup ID', type: 'number' },
      { key: 'major_id', label: 'Major ID', type: 'number' },
      { key: 'student_number', label: 'شماره دانشجویی', type: 'text' },
      { key: 'first_name', label: 'نام', type: 'text' },
      { key: 'last_name', label: 'نام خانوادگی', type: 'text' },
      { key: 'photo_path', label: 'آدرس عکس', type: 'text' },
    ]"
  />
</template>