<script setup>
import { ref, reactive, computed, onMounted } from "vue";
import { http } from "../api/http";

const loading = ref(false);
const error = ref("");

const students = ref([]);
const q = reactive({
  student_number: "",
  first_name: "",
  last_name: "",
  per_page: 50,
});

const lookups = reactive({
  colleges: [],
  educationGroups: [],
  majors: [],
});

const modal = reactive({
  open: false,
  mode: "create", // create | edit
  id: null,
});

const form = reactive({
  college_id: "",
  education_group_id: "",
  major_id: "",
  student_number: "",
  first_name: "",
  last_name: "",
});

const photoFile = ref(null);
const photoPreview = ref("");

const photoUrl = (photo_path) => {
  if (!photo_path) return "";
  // چون در بک‌اند photo_path مثل /storage/... ذخیره میشه:
  return `http://127.0.0.1:8000${photo_path}`;
};

const safeName = (s) => {
  if (!s) return "";
  if (s.full_name) return s.full_name;
  return `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim();
};

// --------------------- load lookups
const loadLookups = async () => {
  const [c, g] = await Promise.all([
    http.get("/lookups/colleges"),
    http.get("/lookups/education-groups"),
  ]);

  lookups.colleges = c.data || [];
  lookups.educationGroups = g.data || [];
};

const loadMajors = async () => {
  if (!form.education_group_id) {
    lookups.majors = [];
    form.major_id = "";
    return;
  }
  const res = await http.get("/lookups/majors", {
    params: { education_group_id: form.education_group_id },
  });
  lookups.majors = res.data || [];
};

// --------------------- list/search
const loadStudents = async () => {
  error.value = "";
  loading.value = true;

  try {
    const res = await http.get("/students", { params: q });
    // paginator: {data: [...]}
    students.value = res?.data?.data ?? [];
  } catch (e) {
    error.value = e?.response?.data?.message ?? "خطا در دریافت لیست دانشجوها";
  } finally {
    loading.value = false;
  }
};

let tmr = null;
const searchDebounced = () => {
  clearTimeout(tmr);
  tmr = setTimeout(() => loadStudents(), 300);
};

// --------------------- modal actions
const resetForm = () => {
  form.college_id = "";
  form.education_group_id = "";
  form.major_id = "";
  form.student_number = "";
  form.first_name = "";
  form.last_name = "";
  photoFile.value = null;
  photoPreview.value = "";
};

const openCreate = async () => {
  resetForm();
  modal.open = true;
  modal.mode = "create";
  modal.id = null;
};

const openEdit = async (row) => {
  resetForm();
  modal.open = true;
  modal.mode = "edit";
  modal.id = row.id;

  form.college_id = row.college_id ?? "";
  form.education_group_id = row.education_group_id ?? "";
  await loadMajors();
  form.major_id = row.major_id ?? "";

  form.student_number = row.student_number ?? "";
  form.first_name = row.first_name ?? "";
  form.last_name = row.last_name ?? "";

  // preview عکس قبلی
  if (row.photo_path) {
    photoPreview.value = photoUrl(row.photo_path);
  }
};

const closeModal = () => {
  modal.open = false;
};

// --------------------- file
const onPickPhoto = (e) => {
  const f = e.target.files?.[0];
  photoFile.value = f || null;

  if (f) {
    photoPreview.value = URL.createObjectURL(f);
  }
};

// --------------------- create/update
const submit = async () => {
  error.value = "";
  loading.value = true;

  try {
    const fd = new FormData();

    // فیلدها
    fd.append("college_id", form.college_id);
    fd.append("education_group_id", form.education_group_id);
    fd.append("major_id", form.major_id);
    fd.append("student_number", form.student_number);
    fd.append("first_name", form.first_name);
    fd.append("last_name", form.last_name);

    // فایل
    if (photoFile.value) {
      fd.append("photo", photoFile.value);
    }

    if (modal.mode === "create") {
      await http.post("/students", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    } else {
      // برای PUT + FormData بهتره _method=PUT
      fd.append("_method", "PUT");

      await http.post(`/students/${modal.id}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    }

    await loadStudents();
    closeModal();
  } catch (e) {
    if (e?.response?.status === 422) {
      const errs = e?.response?.data?.errors;
      const k = errs ? Object.keys(errs)[0] : null;
      error.value = k ? errs[k][0] : "Validation Error";
    } else {
      error.value = e?.response?.data?.message ?? "خطا در ذخیره‌سازی";
    }
  } finally {
    loading.value = false;
  }
};

// --------------------- delete
const removeStudent = async (id) => {
  if (!confirm("دانشجو حذف شود؟")) return;

  error.value = "";
  loading.value = true;
  try {
    await http.delete(`/students/${id}`);
    await loadStudents();
  } catch (e) {
    error.value = e?.response?.data?.message ?? "خطا در حذف";
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  await loadLookups();
  await loadStudents();
});
</script>

<template>
  <div class="card">
    <div class="head">
      <h2>دانشجوها (CRUD + آپلود عکس)</h2>
      <button class="btn" @click="openCreate">+ افزودن دانشجو</button>
    </div>

    <div class="tools">
      <input v-model="q.student_number" @input="searchDebounced" placeholder="شماره دانشجویی" />
      <input v-model="q.first_name" @input="searchDebounced" placeholder="نام" />
      <input v-model="q.last_name" @input="searchDebounced" placeholder="نام خانوادگی" />
      <button class="btn secondary" @click="loadStudents">ریفریش</button>
    </div>

    <div v-if="error" class="error">{{ error }}</div>
    <div v-if="loading" class="muted">در حال دریافت...</div>

    <table>
      <thead>
        <tr>
          <th style="width:70px;">ID</th>
          <th style="width:90px;">عکس</th>
          <th>نام</th>
          <th>شماره</th>
          <th>دانشکده</th>
          <th>گروه</th>
          <th>رشته</th>
          <th style="width:170px;">عملیات</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="s in students" :key="s.id">
          <td>{{ s.id }}</td>
          <td>
            <img v-if="s.photo_path" :src="photoUrl(s.photo_path)" class="avatar" />
            <div v-else class="no-avatar">-</div>
          </td>
          <td>{{ safeName(s) }}</td>
          <td>{{ s.student_number }}</td>
          <td>{{ s.college?.name ?? "-" }}</td>
          <td>{{ s.education_group?.name ?? "-" }}</td>
          <td>{{ s.major?.name ?? "-" }}</td>
          <td class="actions">
            <button class="btn small" @click="openEdit(s)">ویرایش</button>
            <button class="btn danger small" @click="removeStudent(s.id)">حذف</button>
          </td>
        </tr>

        <tr v-if="students.length === 0">
          <td colspan="8" class="muted" style="text-align:center;">موردی وجود ندارد</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Modal -->
  <div v-if="modal.open" class="modal">
    <div class="modal-card">
      <div class="modal-head">
        <h3>{{ modal.mode === "create" ? "افزودن دانشجو" : "ویرایش دانشجو" }}</h3>
        <button class="x" @click="closeModal">✕</button>
      </div>

      <div class="grid">
        <div>
          <label>دانشکده</label>
          <select v-model="form.college_id">
            <option value="">انتخاب</option>
            <option v-for="c in lookups.colleges" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>

        <div>
          <label>گروه آموزشی</label>
          <select v-model="form.education_group_id" @change="loadMajors">
            <option value="">انتخاب</option>
            <option v-for="g in lookups.educationGroups" :key="g.id" :value="g.id">{{ g.name }}</option>
          </select>
        </div>

        <div>
          <label>رشته</label>
          <select v-model="form.major_id">
            <option value="">انتخاب</option>
            <option v-for="m in lookups.majors" :key="m.id" :value="m.id">{{ m.name }}</option>
          </select>
        </div>

        <div>
          <label>شماره دانشجویی</label>
          <input v-model="form.student_number" placeholder="40123456" />
        </div>

        <div>
          <label>نام</label>
          <input v-model="form.first_name" placeholder="نام" />
        </div>

        <div>
          <label>نام خانوادگی</label>
          <input v-model="form.last_name" placeholder="نام خانوادگی" />
        </div>

        <div style="grid-column: 1 / -1;">
          <label>عکس دانشجو</label>
          <input type="file" accept="image/*" @change="onPickPhoto" />
          <div v-if="photoPreview" style="margin-top:10px;">
            <img :src="photoPreview" class="preview" />
          </div>
        </div>
      </div>

      <div class="modal-actions">
        <button class="btn" @click="submit" :disabled="loading">
          {{ modal.mode === "create" ? "ثبت" : "ذخیره" }}
        </button>
        <button class="btn secondary" @click="closeModal">انصراف</button>
      </div>

      <div v-if="error" class="error" style="margin-top:10px;">{{ error }}</div>
    </div>
  </div>
</template>

<style scoped>
.card { background:#fff; border:1px solid #eee; border-radius:12px; padding:16px; }
.head { display:flex; justify-content:space-between; align-items:center; gap:10px; }
.tools { display:flex; flex-wrap:wrap; gap:10px; margin:12px 0; }
input, select { padding:10px; border:1px solid #ddd; border-radius:10px; }
table { width:100%; border-collapse:collapse; margin-top:10px; }
th, td { border:1px solid #eee; padding:8px; font-size:13px; }
th { background:#fafafa; }
.actions { display:flex; gap:8px; justify-content:flex-end; }

.btn { border:1px solid #ddd; background:#fff; padding:8px 12px; border-radius:10px; cursor:pointer; }
.btn:hover { background:#f7f7f7; }
.btn.small { padding:6px 10px; border-radius:8px; }
.btn.secondary { background:#fafafa; }
.btn.danger { border-color:#ffb3b3; }
.btn.danger:hover { background:#fff0f0; }
.muted { color:#666; font-size:12px; }
.error { margin-top:10px; color:#b00020; font-weight:700; }

.avatar { width:44px; height:44px; border-radius:10px; object-fit:cover; border:1px solid #eee; }
.no-avatar { width:44px; height:44px; display:grid; place-items:center; color:#888; }

.modal{ position:fixed; inset:0; background:rgba(0,0,0,.35); display:grid; place-items:center; padding:16px; }
.modal-card{ width:min(900px,100%); background:#fff; border-radius:12px; padding:16px; }
.modal-head{ display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
.x{ border:0; background:transparent; font-size:18px; cursor:pointer; }
.grid{ display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
.modal-actions{ display:flex; gap:10px; justify-content:flex-end; margin-top:12px; }
.preview { width:140px; height:140px; border-radius:12px; object-fit:cover; border:1px solid #eee; }
@media(max-width:900px){ .grid{ grid-template-columns:1fr; } }
</style>