<template>
  <div>
    <!-- Hero Section -->
    <section class="py-8 md:py-16 px-4 md:px-8">
      <div class="max-w-6xl mx-auto">
        <div class="flex flex-col md:flex-row md:items-center">
          <div class="md:w-1/2 mb-8 md:mb-0">
            <h1 class="text-3xl md:text-5xl font-bold mb-4">Example Hero Section</h1>
            <p class="text-lg md:text-xl mb-6">This is an example page showing responsive design for both desktop and mobile devices.</p>
            <div class="flex flex-col sm:flex-row gap-4">
              <UButton color="primary" size="lg">Get Started</UButton>
              <UButton color="gray" variant="outline" size="lg">Learn More</UButton>
            </div>
          </div>
          <div class="md:w-1/2 md:pl-8">
            <div class="bg-white bg-opacity-60 dark:bg-gray-800 dark:bg-opacity-60 rounded-lg shadow-lg p-6 backdrop-blur-sm">
              <h3 class="text-xl font-bold mb-3">Key Features</h3>
              <ul class="space-y-2">
                <li class="flex items-center">
                  <UIcon name="i-heroicons-check-circle" class="mr-2 text-green-500" />
                  <span>Responsive design for all devices</span>
                </li>
                <li class="flex items-center">
                  <UIcon name="i-heroicons-check-circle" class="mr-2 text-green-500" />
                  <span>Mobile-friendly navigation</span>
                </li>
                <li class="flex items-center">
                  <UIcon name="i-heroicons-check-circle" class="mr-2 text-green-500" />
                  <span>Adaptive tables and layouts</span>
                </li>
                <li class="flex items-center">
                  <UIcon name="i-heroicons-check-circle" class="mr-2 text-green-500" />
                  <span>Dark mode support</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Responsive Table Section -->
    <section class="py-8 px-4 md:px-8">
      <div class="max-w-6xl mx-auto">
        <h2 class="text-2xl md:text-3xl font-bold mb-6">Example Responsive Table</h2>

        <!-- Table Controls -->
        <div class="mb-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <UInput
            placeholder="Search kills..."
            icon="i-heroicons-magnifying-glass"
            class="w-full sm:max-w-xs"
          />
          <UButton
            color="primary"
            icon="i-heroicons-funnel"
            size="sm"
          >
            Filter
          </UButton>
        </div>

        <!-- Desktop Table (hidden on mobile) -->
        <div class="hidden md:block overflow-x-auto">
          <UTable
            :columns="tableColumns"
            :rows="tableData"
            :ui="{
              wrapper: 'bg-white bg-opacity-60 dark:bg-black dark:bg-opacity-40 backdrop-blur-sm rounded-lg',
              td: { base: 'whitespace-nowrap py-3 px-4' }
            }"
          >
            <template #value-status="{ value }">
              <UBadge :color="value === 'Active' ? 'green' : 'red'">{{ value }}</UBadge>
            </template>
          </UTable>
        </div>

        <!-- Mobile Cards (shown only on mobile) -->
        <div class="md:hidden space-y-4">
          <div
            v-for="(row, index) in tableData"
            :key="index"
            class="bg-white bg-opacity-60 dark:bg-black dark:bg-opacity-40 backdrop-blur-sm rounded-lg p-4 shadow-sm"
          >
            <div class="flex justify-between items-center mb-2">
              <h4 class="font-bold">{{ row.name }}</h4>
              <UBadge :color="row.status === 'Active' ? 'green' : 'red'">{{ row.status }}</UBadge>
            </div>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <div>
                <div class="text-gray-500 dark:text-gray-400">Ship Type</div>
                <div>{{ row.ship }}</div>
              </div>
              <div>
                <div class="text-gray-500 dark:text-gray-400">Location</div>
                <div>{{ row.location }}</div>
              </div>
              <div>
                <div class="text-gray-500 dark:text-gray-400">ISK</div>
                <div>{{ row.value }}</div>
              </div>
              <div>
                <div class="text-gray-500 dark:text-gray-400">Date</div>
                <div>{{ row.date }}</div>
              </div>
            </div>
            <div class="mt-3 flex justify-end">
              <UButton size="xs" color="gray" variant="ghost">View Details</UButton>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div class="mt-4 flex justify-center sm:justify-between items-center flex-wrap gap-4">
          <p class="text-sm text-gray-500 dark:text-gray-400 order-2 sm:order-1 w-full sm:w-auto text-center sm:text-left">
            Showing 1 to 5 of 25 entries
          </p>
          <UPagination
            v-model="currentPage"
            :page-count="5"
            :total="25"
            :ui="{
              wrapper: 'order-1 sm:order-2'
            }"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
// Page state
const currentPage = ref(1)

// Table columns definition with required id property
const tableColumns = [
  { key: 'name', label: 'Player Name', id: 'name' },
  { key: 'ship', label: 'Ship Type', id: 'ship' },
  { key: 'location', label: 'Location', id: 'location' },
  { key: 'value', label: 'ISK Value', id: 'value' },
  { key: 'date', label: 'Date', id: 'date' },
  { key: 'status', label: 'Status', id: 'status' },
]

// Example table data
const tableData = [
  { name: 'John Doe', ship: 'Rifter', location: 'Jita', value: '15,000,000', date: '2023-06-12', status: 'Active' },
  { name: 'Jane Smith', ship: 'Drake', location: 'Amarr', value: '45,000,000', date: '2023-06-11', status: 'Inactive' },
  { name: 'Bob Johnson', ship: 'Myrmidon', location: 'Dodixie', value: '78,000,000', date: '2023-06-10', status: 'Active' },
  { name: 'Alice Brown', ship: 'Megathron', location: 'Hek', value: '120,000,000', date: '2023-06-09', status: 'Active' },
  { name: 'Charlie Wilson', ship: 'Dominix', location: 'Rens', value: '95,000,000', date: '2023-06-08', status: 'Inactive' },
]
</script>
