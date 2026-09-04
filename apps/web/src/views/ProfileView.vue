<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import {
  DEFAULT_QA,
  isProfileComplete,
  profileSchema,
  type EducationItem,
  type Profile,
  type QaItem,
} from "@qiuzhao/schema";
import { pickPrimaryProfile, request } from "../api";

const loading = ref(false);
const saving = ref(false);
const profile = ref<Profile | null>(null);
const tab = ref<"id" | "edu" | "job">("id");
const fileInput = ref<HTMLInputElement | null>(null);

const complete = computed(() => (profile.value ? isProfileComplete(profile.value) : false));
const missing = computed(() => {
  if (!profile.value) return ["档案"];
  const items: string[] = [];
  if (!profile.value.name.trim()) items.push("姓名");
  if (!profile.value.phone.trim()) items.push("手机");
  if (!profile.value.email.trim()) items.push("邮箱");
  if (!profile.value.education.some((row) => row.school.trim() && row.degree)) items.push("学校");
  return items;
});

function newEducation(): EducationItem {
  return {
    id: crypto.randomUUID(),
    school: "",
    college: "",
    major: "",
    degree: "本科",
    enrollDate: "",
    graduateDate: "",
    gpa: "",
    rank: "",
  };
}

async function ensureProfile() {
  loading.value = true;
  try {
    const data = await request<{ items: Profile[] }>("/profiles");
    if (data.items.length) {
      profile.value = pickPrimaryProfile(data.items);
    } else {
      profile.value = await request<Profile>("/profiles", {
        method: "POST",
        body: JSON.stringify({ name: "", qa: DEFAULT_QA }),
      });
    }
    if (!profile.value) return;
    if (!profile.value.education.length) profile.value.education.push(newEducation());
    if (!profile.value.qa.length) profile.value.qa = [...DEFAULT_QA];
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "加载档案失败");
  } finally {
    loading.value = false;
  }
}

async function save() {
  if (!profile.value) return;
  saving.value = true;
  try {
    profile.value = await request<Profile>(`/profiles/${profile.value.id}`, {
      method: "PUT",
      body: JSON.stringify(profile.value),
    });
    ElMessage.success(complete.value ? "已保存，档案完整" : "已保存，仍缺必填项");
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "保存失败");
  } finally {
    saving.value = false;
  }
}

function addEducation() {
  profile.value?.education.push(newEducation());
}
function removeEducation(id: string) {
  if (!profile.value) return;
  profile.value.education = profile.value.education.filter((item) => item.id !== id);
}
function exportJson() {
  if (!profile.value) return;
  const blob = new Blob([JSON.stringify(profile.value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `profile-${profile.value.name || "export"}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
function importJson() {
  fileInput.value?.click();
}
async function onImportFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file || !profile.value) return;
  try {
    const parsed = profileSchema.parse({
      ...JSON.parse(await file.text()),
      id: profile.value.id,
      createdAt: profile.value.createdAt,
      updatedAt: profile.value.updatedAt,
    });
    profile.value = parsed;
    await save();
    ElMessage.success("已导入并保存");
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "JSON 不符合档案格式");
  } finally {
    (event.target as HTMLInputElement).value = "";
  }
}

onMounted(ensureProfile);
</script>

<template>
  <div v-loading="loading" class="page">
    <header class="page-head">
      <div>
        <h1>档案</h1>
        <p>身份与教育是网申主档。实习和项目写在简历里，不会回写到这里。</p>
      </div>
      <div class="page-actions">
        <span class="badge" :class="{ ok: complete }">{{ complete ? "档案完整" : `缺${missing.join(" / ")}` }}</span>
        <button type="button" class="btn" @click="importJson">导入 JSON</button>
        <button type="button" class="btn" :disabled="!profile" @click="exportJson">导出 JSON</button>
        <button type="button" class="btn btn-primary" :disabled="!profile || saving" @click="save">保存</button>
      </div>
    </header>
    <input ref="fileInput" class="hidden" type="file" accept="application/json" @change="onImportFile" />

    <div v-if="profile" class="surface sheet">
      <div class="seg">
        <button type="button" :class="{ on: tab === 'id' }" @click="tab = 'id'">身份</button>
        <button type="button" :class="{ on: tab === 'edu' }" @click="tab = 'edu'">教育</button>
        <button type="button" :class="{ on: tab === 'job' }" @click="tab = 'job'">意向与材料</button>
      </div>

      <el-form v-show="tab === 'id'" label-width="96px" class="form">
        <div class="grid">
          <el-form-item label="姓名" required><el-input v-model="profile.name" placeholder="网申显示的姓名" /></el-form-item>
          <el-form-item label="性别">
            <el-select v-model="profile.gender" clearable>
              <el-option label="男" value="男" />
              <el-option label="女" value="女" />
              <el-option label="其他" value="其他" />
            </el-select>
          </el-form-item>
          <el-form-item label="民族"><el-input v-model="profile.ethnicity" /></el-form-item>
          <el-form-item label="证件类型">
            <el-select v-model="profile.idType">
              <el-option label="身份证" value="身份证" />
              <el-option label="护照" value="护照" />
              <el-option label="其他" value="其他" />
            </el-select>
          </el-form-item>
          <el-form-item label="证件号"><el-input v-model="profile.idNumber" /></el-form-item>
          <el-form-item label="手机" required><el-input v-model="profile.phone" /></el-form-item>
          <el-form-item label="邮箱" required><el-input v-model="profile.email" /></el-form-item>
          <el-form-item label="政治面貌"><el-input v-model="profile.politicalStatus" placeholder="共青团员 / 群众 / …" /></el-form-item>
          <el-form-item label="籍贯"><el-input v-model="profile.nativePlace" /></el-form-item>
          <el-form-item label="现居地"><el-input v-model="profile.currentCity" /></el-form-item>
        </div>
      </el-form>

      <div v-show="tab === 'edu'" class="edu">
        <div v-for="item in profile.education" :key="item.id" class="edu-card">
          <el-form label-width="96px">
            <div class="grid">
              <el-form-item label="学校" required><el-input v-model="item.school" /></el-form-item>
              <el-form-item label="学院"><el-input v-model="item.college" /></el-form-item>
              <el-form-item label="专业"><el-input v-model="item.major" /></el-form-item>
              <el-form-item label="学历" required>
                <el-select v-model="item.degree">
                  <el-option v-for="d in ['高中', '专科', '本科', '硕士', '博士', '其他']" :key="d" :label="d" :value="d" />
                </el-select>
              </el-form-item>
              <el-form-item label="入学"><el-input v-model="item.enrollDate" placeholder="YYYY-MM" /></el-form-item>
              <el-form-item label="毕业"><el-input v-model="item.graduateDate" placeholder="YYYY-MM" /></el-form-item>
              <el-form-item label="GPA"><el-input v-model="item.gpa" /></el-form-item>
              <el-form-item label="排名"><el-input v-model="item.rank" /></el-form-item>
            </div>
            <button type="button" class="btn btn-ghost" @click="removeEducation(item.id)">删除这段教育</button>
          </el-form>
        </div>
        <button type="button" class="btn" @click="addEducation">增加一段教育</button>
      </div>

      <el-form v-show="tab === 'job'" label-width="120px" class="form">
        <el-form-item label="求职类型">
          <el-radio-group v-model="profile.jobType">
            <el-radio value="校招">校招</el-radio>
            <el-radio value="实习">实习</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="期望城市">
          <el-select v-model="profile.cities" multiple filterable allow-create default-first-option>
            <el-option v-for="city in ['北京', '上海', '深圳', '杭州', '广州', '成都', '南京', '武汉']" :key="city" :label="city" :value="city" />
          </el-select>
        </el-form-item>
        <el-form-item label="期望薪资"><el-input v-model="profile.expectedSalary" placeholder="例如 15-25k" /></el-form-item>
        <el-form-item label="到岗时间"><el-input v-model="profile.availableDate" placeholder="YYYY-MM-DD 或 毕业后" /></el-form-item>
        <el-form-item label="实习转正"><el-switch v-model="profile.internToFull" /></el-form-item>
        <el-form-item label="简历 PDF 路径"><el-input v-model="profile.resumePdfPath" placeholder="本机绝对路径，服务端不搬文件" /></el-form-item>
        <el-form-item label="证件照路径"><el-input v-model="profile.photoPath" /></el-form-item>
        <el-form-item label="成绩单路径"><el-input v-model="profile.transcriptPath" /></el-form-item>
        <p class="hint">问答库</p>
        <el-form-item v-for="item in profile.qa as QaItem[]" :key="item.key" :label="item.question">
          <el-input v-model="item.answer" />
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<style scoped>
.badge {
  align-self: center;
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 999px;
  background: #fde8e1;
  color: var(--danger);
}
.badge.ok {
  background: #e4f4ea;
  color: var(--ok);
}
.sheet {
  padding: 20px 24px 28px;
}
.form,
.edu {
  margin-top: 18px;
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 16px;
}
.edu-card {
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 12px 12px 8px;
  margin-bottom: 12px;
  background: #fff;
}
.hidden {
  display: none;
}
@media (max-width: 800px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
