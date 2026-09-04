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
  <div class="board">
    <p class="lead">投递闭环排在后面的阶段。现在可以先把简历和档案准备好。预填不等于代投。</p>
    <div class="cols">
      <section v-for="col in columns" :key="col.key" class="page-card col">
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
.lead {
  margin: 0 0 16px;
  color: var(--muted);
}
.cols {
  display: grid;
  grid-template-columns: repeat(6, minmax(140px, 1fr));
  gap: 10px;
  overflow-x: auto;
}
.col {
  min-height: 280px;
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
  padding: 28px 8px;
  text-align: center;
  color: var(--muted);
  font-size: 12px;
}
@media (max-width: 1100px) {
  .cols {
    grid-template-columns: repeat(3, minmax(160px, 1fr));
  }
}
</style>
