<script setup>
import { ref, computed, reactive, onMounted } from "vue";
import { http } from "../api/http";

// ---------- state
const loading = ref(false);
const error = ref("");

const search = reactive({
  student_number: "",
  first_name: "",
  last_name: "",
});

const students = ref([]);
const selectedStudentId = ref(null);
const report = ref(null);
const lessons = ref([]);

// modal/form state
const form = reactive({
  open: false,
  mode: "create", // create | edit
  termId: null,
  resultId: null,

  lesson_id: "",
  grade: "",
  grade_status: 1,
  coach_name: "",
  description: "",
});

// ---------- utils
const safeFullName = (s) => {
  if (!s) return "";
  if (s.full_name) return s.full_name;
  const fn = s.first_name ?? "";
  const ln = s.last_name ?? "";
  return `${fn} ${ln}`.trim();
};

const gradeStatusText = (s) => {
  const v = Number(s);
  const map = { 1: "قبول", 2: "مردود", 3: "ناقص", 4: "حذف" };
  return map[v] ?? String(s ?? "");
};

const resetForm = () => {
  form.open = false;
  form.mode = "create";
  form.termId = null;
  form.resultId = null;
  form.lesson_id = "";
  form.grade = "";
  form.grade_status = 1;
  form.coach_name = "";
  form.description = "";
};

const canSearch = computed(() => {
  return Boolean(search.student_number || search.first_name || search.last_name);
});

const termAverage = (term) => {
  const results = Array.isArray(term?.results) ? term.results : [];
  const rows = results.filter((r) => r?.grade !== null && r?.grade !== undefined && r?.grade !== "");
  if (!rows.length) return "0.00";
  const sum = rows.reduce((a, r) => a + Number(r.grade), 0);
  return (sum / rows.length).toFixed(2);
};

// ---------- api
const loadLessons = async () => {
  const res = await http.get("/lookups/lessons");
  lessons.value = Array.isArray(res.data) ? res.data : [];
};

const searchStudents = async () => {
  error.value = "";
  students.value = [];
  report.value = null;
  selectedStudentId.value = null;

  if (!canSearch.value) return;

  loading.value = true;
  try {
    const res = await http.get("/students", {
      params: { ...search, per_page: 20 },
    });

    // Laravel paginator returns {data: [...]}
    students.value = res?.data?.data ?? [];
  } catch (e) {
    error.value = e?.response?.data?.message ?? "خطا در دریافت لیست دانشجوها";
  } finally {
    loading.value = false;
  }
};

const loadReport = async (id) => {
  error.value = "";
  loading.value = true;
  try {
    const res = await http.get(`/students/${id}`);
    report.value = res.data;
    selectedStudentId.value = id;
    resetForm();
  } catch (e) {
    error.value = e?.response?.data?.message ?? "خطا در دریافت گزارش دانشجو";
  } finally {
    loading.value = false;
  }
};

const openCreateForTerm = (termId) => {
  resetForm();
  form.open = true;
  form.mode = "create";
  form.termId = termId;
};

const openEdit = (termId, r) => {
  resetForm();
  form.open = true;
  form.mode = "edit";
  form.termId = termId;
  form.resultId = r?.id ?? null;

  form.lesson_id = r?.lesson_id ?? "";
  form.grade = r?.grade ?? "";
  form.grade_status = r?.grade_status ?? 1;
  form.coach_name = r?.coach_name ?? "";
  form.description = r?.description ?? "";
};

const submit = async () => {
  error.value = "";

  if (!form.termId) {
    error.value = "ترم انتخاب نشده است.";
    return;
  }
  if (!form.lesson_id) {
    error.value = "درس را انتخاب کن.";
    return;
  }

  loading.value = true;

  const payload = {
    lesson_id: Number(form.lesson_id),
    grade: form.grade === "" ? null : Number(form.grade),
    grade_status: Number(form.grade_status),
    coach_name: form.coach_name ? form.coach_name : null,
    description: form.description ? form.description : null,
  };

  try {
    if (form.mode === "create") {
      await http.post(`/terms/${form.termId}/results`, payload);
    } else {
      if (!form.resultId) throw new Error("resultId missing");
      await http.put(`/results/${form.resultId}`, payload);
    }

    // refresh report
    await loadReport(selectedStudentId.value);
  } catch (e) {
    if (e?.response?.status === 422) {
      // show laravel validation errors (first message)
      const errs = e?.response?.data?.errors;
      const firstKey = errs ? Object.keys(errs)[0] : null;
      error.value = firstKey ? errs[firstKey][0] : "Validation Error";
    } else {
      error.value = e?.response?.data?.message ?? "خطا در ذخیره‌سازی";
    }
  } finally {
    loading.value = false;
  }
};

const removeResult = async (resultId) => {
  if (!resultId) return;
  const ok = confirm("حذف شود؟");
  if (!ok) return;

  error.value = "";
  loading.value = true;
  try {
    await http.delete(`/results/${resultId}`);
    await loadReport(selectedStudentId.value);
  } catch (e) {
    error.value = e?.response?.data?.message ?? "خطا در حذف";
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  await loadLessons();
});
</script>

<template>
  <div class="page">
    <!-- Search -->
    <div class="card">
      <h2>مدیریت نمرات ترم دانشجو</h2>

      <div class="grid">
        <div>
          <label>شماره دانشجویی</label>
          <input v-model="search.student_number" @input="searchStudents" placeholder="40123456" />
        </div>
        <div>
          <label>نام</label>
          <input v-model="search.first_name" @input="searchStudents" placeholder="نام" />
        </div>
        <div>
          <label>نام خانوادگی</label>
          <input v-model="search.last_name" @input="searchStudents" placeholder="نام خانوادگی" />
        </div>
      </div>

      <div v-if="error" class="error">{{ error }}</div>
      <div v-if="loading" class="muted">در حال دریافت...</div>

      <div v-if="students.length" class="list">
        <div
          v-for="s in students"
          :key="s.id"
          class="list-item"
          :class="{ active: s.id === selectedStudentId }"
          @click="loadReport(s.id)"
        >
          <div class="title">{{ safeFullName(s) }} — {{ s.student_number }}</div>
          <div class="muted">
            {{ s?.college?.name ?? "-" }} | {{ s?.education_group?.name ?? "-" }} | {{ s?.major?.name ?? "-" }}
          </div>
        </div>
      </div>

      <div v-else class="muted" style="margin-top: 12px;">
        برای نمایش لیست، حداقل یکی از فیلدها را وارد کن.
      </div>
    </div>

    <!-- Report -->
    <div v-if="report" class="card">
      <div class="header">
        <div class="photo">
          <img v-if="report.photo_path" :src="report.photo_path" alt="photo" />
          <div v-else class="no-photo">بدون عکس</div>
        </div>

        <div class="meta">
          <div class="row">
            <div><b>دانشکده:</b> {{ report?.college?.name ?? "-" }}</div>
            <div><b>شماره:</b> {{ report?.student_number ?? "-" }}</div>
            <div><b>نام:</b> {{ safeFullName(report) }}</div>
          </div>
          <div class="row">
            <div><b>گروه:</b> {{ report?.education_group?.name ?? "-" }}</div>
            <div><b>رشته:</b> {{ report?.major?.name ?? "-" }}</div>
            <div><b>نام خانوادگی:</b> {{ report?.last_name ?? "-" }}</div>
          </div>
        </div>
      </div>

      <div v-if="report?.terms?.length" class="terms">
        <div v-for="t in report.terms" :key="t.id" class="term">
          <div class="term-head">
            <h3>ترم {{ t.term_number }}</h3>
            <div class="right">
              <span class="avg">میانگین: {{ termAverage(t) }}</span>
              <button class="btn" @click="openCreateForTerm(t.id)">+ افزودن درس</button>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>کد</th>
                <th>نام درس</th>
                <th>واحد</th>
                <th>نمره</th>
                <th>وضعیت</th>
                <th>استاد</th>
                <th>توضیح</th>
                <th style="width: 140px;">عملیات</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in (t.results || [])" :key="r.id">
                <td>{{ r?.lesson?.code ?? "-" }}</td>
                <td>{{ r?.lesson?.name ?? "-" }}</td>
                <td>{{ r?.lesson?.unit ?? "-" }}</td>
                <td>{{ r?.grade ?? "-" }}</td>
                <td>{{ gradeStatusText(r?.grade_status) }}</td>
                <td>{{ r?.coach_name ?? "-" }}</td>
                <td>{{ r?.description ?? "-" }}</td>
                <td class="actions">
                  <button class="btn small" @click="openEdit(t.id, r)">ویرایش</button>
                  <button class="btn danger small" @click="removeResult(r.id)">حذف</button>
                </td>
              </tr>

              <tr v-if="!t.results || t.results.length === 0">
                <td colspan="8" class="muted" style="text-align:center;">
                  هنوز درسی برای این ترم ثبت نشده است.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-else class="muted">این دانشجو ترمی ندارد.</div>
    </div>

    <!-- Modal -->
    <div v-if="form.open" class="modal">
      <div class="modal-card">
        <div class="modal-head">
          <h3>{{ form.mode === "create" ? "افزودن درس به ترم" : "ویرایش نتیجه" }}</h3>
          <button class="x" @click="resetForm">✕</button>
        </div>

        <div class="grid2">
          <div>
            <label>درس</label>
            <select v-model="form.lesson_id">
              <option value="">انتخاب درس</option>
              <option v-for="l in lessons" :key="l.id" :value="l.id">
                {{ l.code }} - {{ l.name }} ({{ l.unit }})
              </option>
            </select>
          </div>

          <div>
            <label>نمره</label>
            <input v-model="form.grade" type="number" step="0.01" min="0" max="20" placeholder="18.50" />
          </div>

          <div>
            <label>وضعیت</label>
            <select v-model="form.grade_status">
              <option :value="1">قبول</option>
              <option :value="2">مردود</option>
              <option :value="3">ناقص</option>
              <option :value="4">حذف</option>
            </select>
          </div>

          <div>
            <label>استاد</label>
            <input v-model="form.coach_name" placeholder="نام استاد" />
          </div>

          <div style="grid-column: 1 / -1;">
            <label>توضیحات</label>
            <input v-model="form.description" placeholder="توضیح کوتاه" />
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn" @click="submit" :disabled="loading">
            {{ form.mode === "create" ? "ثبت" : "ذخیره" }}
          </button>
          <button class="btn secondary" @click="resetForm">انصراف</button>
        </div>

        <div v-if="error" class="error" style="margin-top: 10px;">{{ error }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  max-width: 1200px;
  margin: 30px auto;
  padding: 0 16px;
  direction: rtl;
  font-family: Arial, sans-serif;
  background: #f5f6fa;
}
.card {
  background: white;
  border: 1px solid #eee;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 12px;
}
.grid2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
label {
  display: block;
  font-size: 12px;
  margin-bottom: 6px;
  color: #333;
}
input, select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 8px;
}
.list {
  margin-top: 12px;
  display: grid;
  gap: 8px;
}
.list-item {
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 10px;
  cursor: pointer;
}
.list-item:hover { background: #fafafa; }
.list-item.active { border-color: #999; }
.title { font-weight: 700; }
.muted { color: #666; font-size: 12px; }
.error { margin-top: 10px; color: #b00020; font-weight: 700; }

.header {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 16px;
}
.photo img {
  width: 120px;
  height: 120px;
  object-fit: cover;
  border-radius: 10px;
  border: 1px solid #eee;
}
.no-photo {
  width: 120px;
  height: 120px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  border: 1px dashed #bbb;
  color: #666;
  font-size: 12px;
}
.meta { flex: 1; }
.row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 8px;
}

.term {
  border-top: 1px solid #eee;
  padding-top: 12px;
  margin-top: 12px;
}
.term-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.right { display: flex; gap: 10px; align-items: center; }
.avg { font-weight: 700; }

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
}
th, td {
  border: 1px solid #eee;
  padding: 8px;
  font-size: 13px;
}
th { background: #fafafa; }
.actions { display: flex; gap: 8px; justify-content: flex-end; }

.btn {
  border: 1px solid #ddd;
  background: white;
  padding: 8px 12px;
  border-radius: 10px;
  cursor: pointer;
}
.btn:hover { background: #f7f7f7; }
.btn.small { padding: 6px 10px; border-radius: 8px; }
.btn.secondary { background: #fafafa; }
.btn.danger { border-color: #ffb3b3; }
.btn.danger:hover { background: #fff0f0; }

.modal {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.35);
  display: grid;
  place-items: center;
  padding: 16px;
}
.modal-card {
  width: min(780px, 100%);
  background: white;
  border-radius: 12px;
  padding: 16px;
}
.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.x {
  border: 0;
  background: transparent;
  font-size: 18px;
  cursor: pointer;
}
.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 12px;
}

@media (max-width: 900px) {
  .grid, .row, .grid2 { grid-template-columns: 1fr; }
  .header { flex-direction: column; align-items: flex-start; }
}
</style>