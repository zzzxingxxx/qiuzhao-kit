<script setup lang="ts">
const columns = [
  { key: "draft", name: "待投" },
  { key: "applied", name: "已投" },
  { key: "exam", name: "笔试" },
  { key: "interview", name: "面试" },
  { key: "offer", name: "offer" },
  { key: "reject", name: "挂" },
];
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1>看板</h1>
        <p>投递闭环排在后面的阶段。预填不等于代投，提交按钮永远由你亲手点。</p>
      </div>
    </header>
    <div class="cols">
      <section v-for="col in columns" :key="col.key" class="surface col">
        <header>
          <strong>{{ col.name }}</strong>
          <span>0</span>
        </header>
        <div class="empty">暂无卡片</div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.cols {
  display: grid;
  grid-template-columns: repeat(6, minmax(140px, 1fr));
  gap: 10px;
  overflow-x: auto;
}
.col {
  min-height: 320px;
  padding: 14px;
}
.col header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  color: var(--muted);
  font-size: 13px;
}
.empty {
  border: 1px dashed var(--line);
  border-radius: 12px;
  padding: 36px 8px;
  text-align: center;
  color: var(--muted);
  font-size: 12px;
  background: #fff;
}
@media (max-width: 1100px) {
  .cols {
    grid-template-columns: repeat(3, minmax(160px, 1fr));
  }
}
</style>
