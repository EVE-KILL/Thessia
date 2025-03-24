<script setup lang="ts">
import type { IKillmail } from '~/server/interfaces/IKillmail';

const props = defineProps<{
    killmail: IKillmail | null;
}>();

const items = ref([
  {
    label: 'DOTLAN',
    children: [
        {
            label: 'System',
            description: props.killmail?.system_name,
            to: `https://evemaps.dotlan.net/system/${props.killmail?.system_name || ''}`,
            disabled: false
        },
        {
            label: 'Region',
            description: props.killmail?.region_name.en,
            to: `https://evemaps.dotlan.net/region/${props.killmail?.region_name.en || ''}`,
            disabled: false
        }
    ]
  },
  {
    label: 'EVEEye',
    children: [
        {
            label: 'Region',
            description: props.killmail?.region_name.en,
            to: `https://eveeye.com/?m=${encodeURIComponent(props.killmail?.region_name.en || '')}`,
            disabled: false
        }
    ]
  },
  {
    label: 'EVE Missioneer',
    children: [
        {
            label: 'System',
            description: props.killmail?.system_name,
            to: `https://evemissioneer.com/s/${encodeURIComponent(props.killmail?.system_id || '')}`,
            disabled: false
        },
        {
            label: 'Region',
            description: props.killmail?.region_name.en,
            to: `https://evemissioneer.com/r/${encodeURIComponent(props.killmail?.region_id || '')}`,
            disabled: false
        }
    ]
  },
  {
    label: 'EveShip.fit',
    children: [
        {
            label: 'Fitting',
            description: 'Fitting for ship: ' + props.killmail?.victim.ship_name.en,
            to: `https://eveship.fit/?fit=killmail:${props.killmail?.killmail_id || ''}/${props.killmail?.killmail_hash || ''}`,
            disabled: false
        }
    ],
  },
  {
    label: 'EVERef',
    children: [
        {
            label: 'Ship Group',
            description: props.killmail?.victim.ship_group_name.en,
            to: `https://everef.net/groups/${props.killmail?.victim.ship_group_id || ''}`,
            disabled: false
        },
        {
            label: 'Ship',
            description: props.killmail?.victim.ship_name.en,
            to: `https://everef.net/type/${props.killmail?.victim.ship_id || ''}`,
            disabled: false
        }
    ]
  },
  {
    label: 'Jita.Space',
    children: [
        {
            label: 'System',
            description: props.killmail?.system_name,
            to: `https://jita.space/system/${props.killmail?.system_id || ''}`,
            disabled: false
        },
        {
            label: 'Region',
            description: props.killmail?.region_name.en,
            to: `https://jita.space/region/${props.killmail?.region_id || ''}`,
            disabled: false
        }
    ]
  },
  {
    label: 'EVEWho',
    children: [
        {
            label: 'Character',
            description: props.killmail?.victim.character_name,
            to: `https://evewho.com/character/${props.killmail?.victim.character_id || ''}`,
            disabled: false
        },
        {
            label: 'Corporation',
            description: props.killmail?.victim.corporation_name,
            to: `https://evewho.com/corporation/${props.killmail?.victim.corporation_id || ''}`,
            disabled: false
        },
        {
            label: 'Alliance',
            description: props.killmail?.victim.alliance_name,
            to: `https://evewho.com/alliances/${props.killmail?.victim.alliance_id || ''}`,
            disabled: props.killmail?.victim.alliance_id === 0
        }
    ]
  },
  {
    label: 'ZKillboard',
    children: [
        {
            label: 'Killmail',
            description: props.killmail?.killmail_id,
            to: `https://zkillboard.com/kill/${props.killmail?.killmail_id || ''}`,
        },
        {
            label: 'System',
            description: props.killmail?.system_name,
            to: `https://zkillboard.com/system/${props.killmail?.system_id || ''}`,
            disabled: false
        },
        {
            label: 'Region',
            description: props.killmail?.region_name.en,
            to: `https://zkillboard.com/region/${props.killmail?.region_id || ''}`,
            disabled: false
        },
        {
            label: 'Ship Group',
            description: props.killmail?.victim.ship_group_name.en,
            to: `https://zkillboard.com/group/${props.killmail?.victim.ship_group_id || ''}`,
            disabled: false
        },
        {
            label: 'Ship',
            description: props.killmail?.victim.ship_name.en,
            to: `https://zkillboard.com/item/${props.killmail?.victim.ship_id || ''}`,
            disabled: false
        },
        {
            label: 'Character',
            description: props.killmail?.victim.character_name,
            to: `https://zkillboard.com/character/${props.killmail?.victim.character_id || ''}`,
            disabled: false
        },
        {
            label: 'Corporation',
            description: props.killmail?.victim.corporation_name,
            to: `https://zkillboard.com/corporation/${props.killmail?.victim.corporation_id || ''}`,
            disabled: false
        },
        {
            label: 'Alliance',
            description: props.killmail?.victim.alliance_name,
            to: `https://zkillboard.com/alliances/${props.killmail?.victim.alliance_id || ''}`,
            disabled: props.killmail?.victim.alliance_id === 0
        }
    ]
  }
])
</script>

<template>
  <UNavigationMenu :items="items" arrow content-orientation="vertical" class="w-full z-50" />
</template>
