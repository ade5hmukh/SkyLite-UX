<script setup lang="ts">
import type { CreateUserInput, CreateIntegrationInput } from '~/types/database'

const { users, loading, error, fetchUsers, createUser, deleteUser } = useUsers()
const { integrations, loading: integrationsLoading, fetchIntegrations, createIntegration, updateIntegration, deleteIntegration } = useIntegrations()

// Form state
const showNewUserForm = ref(false)
const newUser = reactive<CreateUserInput>({
  name: '',
  email: ''
})

const handleCreateUser = async () => {
  if (!newUser.name.trim()) return
  
  try {
    await createUser({ 
      name: newUser.name.trim(),
      email: newUser.email.trim() || ''  // Send empty string if no email
    })
    
    // Reset form
    Object.assign(newUser, { name: '', email: '' })
    showNewUserForm.value = false
  } catch (error) {
    console.error('Failed to create user:', error)
  }
}

const handleDeleteUser = async (userId: string, userName: string) => {
  if (!confirm(`Are you sure you want to delete user "${userName}"? Their todos will be moved to the Unassigned column.`)) {
    return
  }
  
  try {
    await deleteUser(userId)
  } catch (error) {
    console.error('Failed to delete user:', error)
  }
}

// Integration form state
const showNewIntegrationForm = ref(false)
const newIntegration = reactive<CreateIntegrationInput>({
  name: '',
  type: 'calendar',
  service: '',
  apiKey: '',
  baseUrl: '',
  enabled: true
})

const integrationTypes = [
  { 
    label: 'Calendar',
    value: 'calendar',
    services: [
      { label: 'Google Calendar', value: 'google' },
      { label: 'Outlook', value: 'outlook' }
    ]
  },
  { 
    label: 'Todo',
    value: 'todo',
    services: [
      { label: 'Todoist', value: 'todoist' },
      { label: 'Microsoft To Do', value: 'mstodo' }
    ]
  },
  { 
    label: 'Shopping List',
    value: 'shopping',
    services: [
      { label: 'Tandoor', value: 'tandoor' },
      { label: 'Mealie', value: 'mealie' }
    ]
  },
  { 
    label: 'Meal Planner',
    value: 'meal',
    services: [
      { label: 'Tandoor', value: 'tandoor' },
      { label: 'Mealie', value: 'mealie' }
    ]
  }
]

// Add active tab state
const activeIntegrationTab = ref('calendar')

// Add computed property to filter integrations by type
const filteredIntegrations = computed(() => {
  return integrations.value.filter(integration => integration.type === activeIntegrationTab.value)
})

// Add computed property to get available services for current type
const availableServices = computed(() => {
  const type = integrationTypes.find(t => t.value === activeIntegrationTab.value)
  return type ? type.services : []
})

// Watch for tab changes to update the form
watch(activeIntegrationTab, (newType) => {
  if (showNewIntegrationForm.value) {
    newIntegration.type = newType
    const type = integrationTypes.find(t => t.value === newType)
    if (type && type.services.length > 0) {
      newIntegration.service = type.services[0].value
    }
  }
})

const handleCreateIntegration = async () => {
  if (!newIntegration.name.trim() || !newIntegration.service || !newIntegration.apiKey.trim() || !newIntegration.baseUrl.trim()) return
  
  try {
    await createIntegration({
      name: newIntegration.name.trim(),
      type: activeIntegrationTab.value,
      service: newIntegration.service,
      apiKey: newIntegration.apiKey.trim(),
      baseUrl: newIntegration.baseUrl.trim(),
      enabled: newIntegration.enabled
    })
    
    // Reset form
    Object.assign(newIntegration, { 
      name: '', 
      type: activeIntegrationTab.value,
      service: availableServices.value[0]?.value || '',
      apiKey: '', 
      baseUrl: '', 
      enabled: true 
    })
    showNewIntegrationForm.value = false
  } catch (error) {
    console.error('Failed to create integration:', error)
  }
}

const handleDeleteIntegration = async (integrationId: string, integrationName: string) => {
  if (!confirm(`Are you sure you want to delete the "${integrationName}" integration?`)) {
    return
  }
  
  try {
    await deleteIntegration(integrationId)
  } catch (error) {
    console.error('Failed to delete integration:', error)
  }
}

const handleToggleIntegration = async (integrationId: string, enabled: boolean) => {
  try {
    await updateIntegration(integrationId, { enabled })
  } catch (error) {
    console.error('Failed to toggle integration:', error)
  }
}

// Load users and integrations on mount
onMounted(async () => {
  await Promise.all([
    fetchUsers(),
    fetchIntegrations()
  ])
})

// Add this function before the return statement in the script setup
const getIntegrationIcon = (type: string) => {
  switch (type) {
    case 'calendar':
      return 'i-lucide-calendar-days'
    case 'todo':
      return 'i-lucide-list-todo'
    case 'shopping':
      return 'i-lucide-shopping-cart'
    case 'meal':
      return 'i-lucide-utensils'
    default:
      return 'i-lucide-plug'
  }
}
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-4 h-screen">
    <h1 class="font-bold text-2xl text-(--ui-primary)">
      Settings
    </h1>

    <div class="flex items-center gap-2">
      <UButton
        label="Documentation"
        icon="i-lucide-square-play"
        to="https://ui.nuxt.com/getting-started/installation/nuxt"
        target="_blank"
      />

      <UButton
        label="GitHub"
        color="neutral"
        variant="outline"
        icon="i-simple-icons-github"
        to="https://github.com/nuxt/ui"
        target="_blank"
      />
    </div>
  </div>
</template>
