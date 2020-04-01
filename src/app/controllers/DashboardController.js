import { Op } from 'sequelize';
import * as Yup from 'yup';

import {
  isAfter,
  isBefore,
  parseISO,
  setSeconds,
  setMinutes,
  setHours,
} from 'date-fns';

import Deliveryman from '../models/Deliveryman';
import Delivery from '../models/Delivery';
import Recipient from '../models/Recipient';
import File from '../models/File';

class DashboardController {
  async index(req, res) {
    const { id: deliverymanId } = req.params;

    const deliveryman = await Deliveryman.findByPk(deliverymanId);

    if (!deliveryman) {
      return res.status(400).json({ error: 'Delivery man does not exists' });
    }

    const deliveries = await Delivery.findAll({
      where: {
        deliveryman_id: deliverymanId,
        canceled_at: null,
        end_date: null,
      },
      attributes: [
        'id',
        'deliveryman_id',
        'product',
        'start_date',
        'end_date',
        'canceled_at',
      ],
      order: ['id'],
      include: [
        {
          model: Recipient,
          as: 'recipient',
          attributes: [
            'id',
            'name',
            'state',
            'city',
            'street',
            'number',
            'complement',
            'zip_code',
          ],
        },
        {
          model: File,
          as: 'signature',
          attributes: ['id', 'url', 'path'],
        },
      ],
    });

    return res.json(deliveries);
  }

  async show(req, res) {
    const { id } = req.params;

    const deliveryman = await Deliveryman.findByPk(id);

    if (!deliveryman) {
      return res.status(400).json({ error: 'Deliveryman not found.' });
    }

    const order = await Delivery.findAll({
      where: {
        deliveryman_id: id,
        end_date: {
          [Op.not]: null,
        },
      },
      attributes: [
        'id',
        'deliveryman_id',
        'product',
        'start_date',
        'end_date',
        'canceled_at',
      ],
      include: [
        {
          model: Recipient,
          as: 'recipient',
          attributes: [
            'id',
            'name',
            'state',
            'city',
            'street',
            'number',
            'complement',
            'zip_code',
          ],
        },
        {
          model: File,
          as: 'signature',
          attributes: ['url', 'path'],
        },
      ],
    });

    if (!order) {
      return res.status(400).json({ error: 'This order connot be found.' });
    }

    return res.json(order);
  }

  async update(req, res) {
    const schema = Yup.object().shape({
      start_date: Yup.date(),
      end_date: Yup.date(),
      signatureId: Yup.number(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    // Verifica se existe um entregador
    const { deliveryman_id, delivery_id } = req.params;

    const deliverymanExists = await Deliveryman.findOne({
      where: { id: deliveryman_id },
    });

    const deliveryExists = await Delivery.findOne({
      where: { id: delivery_id },
    });

    if (!deliverymanExists && !deliveryExists) {
      return res
        .status(400)
        .json({ error: 'Delivery and Deliveryman does not exists' });
    }

    if (!deliverymanExists) {
      return res.status(400).json({ error: 'Deliveryman does not exists' });
    }

    if (!deliveryExists) {
      return res.status(400).json({ error: 'Delivery does not exists' });
    }

    const { start_date } = req.body;

    const initialDate = parseISO(start_date);

    if (start_date && isBefore(initialDate, new Date()))
      res.status(400).json({ error: 'Past dates are not allowed !' });

    const initialHour = setSeconds(setMinutes(setHours(initialDate, 8), 0), 0);
    const finalHour = setSeconds(setMinutes(setHours(initialDate, 18), 0), 0);

    if (isAfter(initialDate, finalHour) || isBefore(initialDate, initialHour))
      res
        .status(400)
        .json({ error: 'Delivery of orders only between 08:00 and 18:00' });

    return res.json({ ok: 'ok' });
  }
}

export default new DashboardController();
