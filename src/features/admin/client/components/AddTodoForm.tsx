import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Autocomplete, Box, TextField } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { AccentButton, SurfaceCard } from '../styled';
import { CreateTodoSchema, type CreateTodoInput } from '../../todoModel';

type AddTodoFormProps = {
  categories: string[];
  onAdd: (input: CreateTodoInput) => Promise<void>;
};

export default function AddTodoForm({ categories, onAdd }: AddTodoFormProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateTodoInput>({
    resolver: zodResolver(CreateTodoSchema),
    defaultValues: { title: '', category: '' },
  });

  const onSubmit = async (data: CreateTodoInput): Promise<void> => {
    await onAdd(data);
    reset({ title: '', category: '' });
  };

  return (
    <SurfaceCard component="form" onSubmit={handleSubmit(onSubmit)} elevation={0} sx={{ p: { xs: 1.25, sm: 1.5 } }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 1, sm: 1.5 },
          alignItems: { sm: 'flex-start' },
        }}
      >
        <TextField
          {...register('title')}
          placeholder="What needs doing?"
          size="small"
          fullWidth
          autoComplete="off"
          error={Boolean(errors.title)}
          helperText={errors.title?.message}
          sx={{ flex: 1 }}
        />
        <Box sx={{ display: 'flex', gap: 1, width: { xs: '100%', sm: 'auto' } }}>
          <Controller
            control={control}
            name="category"
            render={({ field }) => (
              <Autocomplete
                freeSolo
                options={categories}
                inputValue={field.value ?? ''}
                onInputChange={(_, value) => field.onChange(value)}
                sx={{ minWidth: { sm: 150 }, flex: { xs: 1, sm: 'none' } }}
                renderInput={(params) => <TextField {...params} placeholder="Category" size="small" />}
              />
            )}
          />
          <AccentButton type="submit" aria-label="Add task" disabled={isSubmitting}>
            <AddRoundedIcon />
          </AccentButton>
        </Box>
      </Box>
    </SurfaceCard>
  );
}
