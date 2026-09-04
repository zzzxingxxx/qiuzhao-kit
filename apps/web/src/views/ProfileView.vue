<script setup lang="ts">
import { onMounted, ref } from "vue";

type ProfileItem = { id: string; name: string; phone: string; email: string };

const items = ref<ProfileItem[]>([]);
const error = ref("");
const creating = ref(false);

async function load() {
  error.value = "";
  try {
    const res = await fetch("/api/profiles");
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    items.value = data.items ?? [];
  } catch (e) {
    error.value = e instanceof Error ? e.message : "加载失败";
  }
}

async function createEmpty() {
  creating.value = true;
  error.value = "";
  try {
    const res = await fetch("/api/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "未命名档案" }),
    });
    if (!res.ok) throw new Error(await res.text());
    await load();
  } catch (e) {
    error.value = e instanceof Error ? e.message : "创建失败";
  } finally {
    creating.value = false;
  }
}

onMounted(load);
</script>

<template>
  <el-card shadow="never">
    <template #header>
      <div class="head">
        <span>求职档案</span>
        <el-button type="primary" :loading="creating" @click="createEmpty">新建空档案</el-button>
      </div>
    </template>
    <el-alert v-if="error" :title="error" type="error" show-icon class="mb" />
    <el-empty v-if="!items.length && !error" description="还没有档案。W2 会补完整表单。" />
    <el-table v-else :data="items" stripe>
      <el-table-column prop="name" label="姓名" />
      <el-table-column prop="phone" label="手机" />
      <el-table-column prop="email" label="邮箱" />
      <el-table-column prop="id" label="ID" />
    </el-table>
  </el-card>
</template>

<style scoped>
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.mb {
  margin-bottom: 16px;
}
</style>
